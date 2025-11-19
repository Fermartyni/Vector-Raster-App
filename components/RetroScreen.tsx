import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { ContentMode, DisplayMode, VectorPoint, VectorShape } from '../types';
import { textToVectorShapes } from '../utils/vectorFont';

interface RetroScreenProps {
  mode: DisplayMode;
  contentMode: ContentMode;
  customPoints: VectorPoint[];
  customText: string;
  onCanvasClick: (x: number, y: number) => void;
  beamSpeed: number; // 1-10
  persistence: number; // ms
}

// Pre-defined Ship Shape
const SHIP_SHAPE: VectorShape = {
  id: 'ship',
  points: [
    { x: 50, y: 35 },
    { x: 65, y: 65 },
    { x: 50, y: 55 },
    { x: 35, y: 65 }
  ],
  closed: true
};

const RetroScreen: React.FC<RetroScreenProps> = ({ 
  mode, 
  contentMode, 
  customPoints, 
  customText,
  onCanvasClick,
  beamSpeed,
  persistence
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Handle resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    
    // Initial size
    updateSize();
    
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Handle Click for Draw Mode
  const handleSvgClick = (e: React.MouseEvent) => {
    if (contentMode !== ContentMode.DRAW || !svgRef.current) return;
    
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const margin = 20;
    const { width, height } = dimensions;
    
    // Convert screen pixels to 0-100 logical space
    const logicalX = d3.scaleLinear()
        .domain([margin, width - margin])
        .range([0, 100])
        .clamp(true)(x);

    const logicalY = d3.scaleLinear()
        .domain([margin, height - margin])
        .range([0, 100])
        .clamp(true)(y);
    
    onCanvasClick(logicalX, logicalY);
  };

  // Main Rendering Logic
  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0 || dimensions.height === 0) return;

    const svg = d3.select(svgRef.current);
    
    // 1. CLEANUP
    svg.selectAll("*").interrupt();
    svg.selectAll("*").remove();
    
    let isMounted = true;
    const { width, height } = dimensions;
    
    // Scales
    const margin = 20;
    const xScale = d3.scaleLinear().domain([0, 100]).range([margin, width - margin]);
    const yScale = d3.scaleLinear().domain([0, 100]).range([margin, height - margin]);

    // 2. BACKGROUND GRID (Always draw this first)
    const gridGroup = svg.append("g").attr("class", "grid").attr("opacity", 0.1);
    
    // Horizontal lines
    for(let i = 0; i <= 100; i+=10) {
        gridGroup.append("line")
            .attr("x1", xScale(0)).attr("y1", yScale(i))
            .attr("x2", xScale(100)).attr("y2", yScale(i))
            .attr("stroke", "#39ff14").attr("stroke-width", 1);
    }
    // Vertical lines
    for(let i = 0; i <= 100; i+=10) {
        gridGroup.append("line")
            .attr("x1", xScale(i)).attr("y1", yScale(0))
            .attr("x2", xScale(i)).attr("y2", yScale(100))
            .attr("stroke", "#39ff14").attr("stroke-width", 1);
    }

    // 3. PREPARE CONTENT
    let shapesToDraw: VectorShape[] = [];

    try {
        if (contentMode === ContentMode.PRESET) {
            shapesToDraw = [SHIP_SHAPE];
        } else if (contentMode === ContentMode.DRAW) {
            if (customPoints.length > 0) {
                shapesToDraw = [{
                    id: 'custom-draw',
                    points: customPoints,
                    closed: false
                }];
            }
        } else if (contentMode === ContentMode.TEXT) {
            shapesToDraw = textToVectorShapes(customText || "READY", 5, 45, 5);
        }
    } catch (err) {
        console.error("Shape generation error:", err);
    }

    const lineGenerator = d3.line<VectorPoint>()
      .x(d => xScale(d.x))
      .y(d => yScale(d.y));

    // 4. RENDER MODES
    if (mode === DisplayMode.VECTOR) {
        // --- VECTOR MODE ---
        
        // We draw shapes invisible initially, then beam reveals them, then they fade
        shapesToDraw.forEach((shape, idx) => {
            let points = shape.points;
            if (points.length === 0) return;
            if (shape.closed) points = [...points, points[0]];
            
            // Define the path but make it invisible initially or very dim
            // We'll actually redraw this path in the animation loop to handle fade cleanly
            // Just draw vertices for helper in DRAW mode
            if (contentMode === ContentMode.DRAW) {
                svg.selectAll(`.vertex-${shape.id}`)
                    .data(points)
                    .enter()
                    .append("circle")
                    .attr("cx", d => xScale(d.x))
                    .attr("cy", d => yScale(d.y))
                    .attr("r", 2)
                    .attr("fill", "#39ff14")
                    .attr("opacity", 0.3);
            }
        });

        // Beam Animation Logic
        if (shapesToDraw.length > 0) {
            const beam = svg.append("circle")
                .attr("r", 4)
                .attr("fill", "#ffffff")
                .attr("filter", "drop-shadow(0 0 8px #ffffff)")
                .attr("opacity", 0);

            // Group to hold temporary fading paths
            const pathGroup = svg.append("g").attr("class", "phosphor-trails");

            const animateVectorCycle = async () => {
                if (!isMounted) return;

                for (const shape of shapesToDraw) {
                    if (!isMounted) break;
                    let points = shape.points;
                    if (points.length < 1) continue;
                    if (shape.closed) points = [...points, points[0]];

                    // Move beam to start position (blanking)
                    const startX = xScale(points[0].x);
                    const startY = yScale(points[0].y);
                    
                    beam.attr("opacity", 0).attr("cx", startX).attr("cy", startY);
                    
                    // Short delay for blanking based on speed
                    await new Promise(r => setTimeout(r, 200 / beamSpeed));
                    if (!isMounted) return;

                    // If it's a single point (Draw mode start)
                    if (points.length === 1) {
                        beam.attr("opacity", 1);
                        // Flash a dot
                        const dot = pathGroup.append("circle")
                            .attr("cx", startX)
                            .attr("cy", startY)
                            .attr("r", 2)
                            .attr("fill", "#39ff14")
                            .attr("opacity", 1);
                        
                        dot.transition()
                            .duration(persistence)
                            .attr("opacity", 0)
                            .remove();

                        await new Promise(r => setTimeout(r, 100));
                        continue;
                    }

                    // Create the path we are about to draw
                    // We use a temporary path to calculate length, then render the visual path
                    const pathData = lineGenerator(points);
                    if (!pathData) continue;

                    // Render the "Phosphor" path
                    // It starts hidden, then reveals as beam moves, then fades
                    const phosphorPath = pathGroup.append("path")
                        .attr("d", pathData)
                        .attr("fill", "none")
                        .attr("stroke", "#39ff14")
                        .attr("stroke-width", 2)
                        .attr("stroke-linejoin", "round")
                        .attr("stroke-linecap", "round")
                        .attr("filter", "drop-shadow(0 0 4px #39ff14)")
                        .attr("opacity", 1); // Start visible for drawing

                    const len = phosphorPath.node()?.getTotalLength() || 0;
                    
                    // Set dash array to hide it initially
                    phosphorPath
                        .attr("stroke-dasharray", `${len} ${len}`)
                        .attr("stroke-dashoffset", len);

                    beam.attr("opacity", 1);

                    // SPEED CALCULATION:
                    // Base duration adjusted by beamSpeed (1-10). 
                    // Higher speed = lower duration.
                    // 1 = slow, 10 = fast.
                    const drawDuration = (len * 15) / (beamSpeed * 0.8); 

                    // Animate Beam & Path Reveal
                    if (len > 0) {
                        // 1. Reveal the path (stroke-dashoffset)
                        phosphorPath.transition()
                            .duration(drawDuration)
                            .ease(d3.easeLinear)
                            .attr("stroke-dashoffset", 0)
                            .on("end", () => {
                                // 2. Once drawn (or as it draws?), Start Decay
                                // To simulate persistence, the whole line fades out after drawn
                                phosphorPath.transition()
                                    .duration(persistence)
                                    .ease(d3.easeExpOut) // Fade out curve
                                    .attr("opacity", 0)
                                    .remove();
                            });

                        // 2. Move the Beam
                        await beam.transition()
                            .duration(drawDuration)
                            .ease(d3.easeLinear)
                            .attrTween("cx", () => (t) => {
                                const p = phosphorPath.node()?.getPointAtLength(t * len);
                                return p ? p.x.toString() : startX.toString();
                            })
                            .attrTween("cy", () => (t) => {
                                const p = phosphorPath.node()?.getPointAtLength(t * len);
                                return p ? p.y.toString() : startY.toString();
                            })
                            .end()
                            .catch(() => {}); 
                    }
                }

                if (isMounted) {
                    // Recursion for the loop
                    // Delay slightly before restarting frame to simulate refresh rate
                    // High speed = low delay
                    setTimeout(animateVectorCycle, 100 / beamSpeed);
                }
            };
            
            animateVectorCycle();
        }

    } else {
        // --- RASTER MODE ---
        
        // Render static-ish shapes but make them fade unless refreshed
        const rasterGroup = svg.append("g").attr("class", "raster-content");

        shapesToDraw.forEach(shape => {
            let points = shape.points;
            if (points.length === 0) return;
            if (shape.closed) points = [...points, points[0]];

            // Raster lines
            rasterGroup.append("path")
                .datum(points)
                .attr("d", lineGenerator)
                .attr("fill", "none")
                .attr("stroke", "rgba(57, 255, 20, 0.8)") // Start bright
                .attr("stroke-width", 4)
                .attr("stroke-dasharray", "4, 4") 
                .attr("stroke-linecap", "butt") 
                .attr("shape-rendering", "crispEdges")
                .attr("filter", "drop-shadow(0 0 2px #39ff14)");
        });

        // Fade the entire raster content out constantly
        // The scanline resets it.
        // Since we can't easily detect "collision" of scanline with SVG elements efficiently in React/D3 loop,
        // We will simulate it: 
        // 1. Image fades to 0.
        // 2. Scanline runs.
        // 3. When scanline finishes, we flash the image back to 1? 
        // Better: Image opacity is handled by a separate loop or just simple fade-in-out loop synced with scanline.
        
        const scanDuration = 5000 / beamSpeed;

        // Scanline Beam
        const scanline = svg.append("line")
            .attr("x1", 0).attr("x2", width)
            .attr("y1", 0).attr("y2", 0)
            .attr("stroke", "rgba(255, 255, 255, 0.5)")
            .attr("stroke-width", 2)
            .attr("filter", "drop-shadow(0 0 4px white)");

        const runScanline = () => {
            if(!isMounted) return;

            // Reset image opacity to 1 (Simulating the scanline refreshing the phosphors)
            // Actually, in raster, top refreshes before bottom.
            // Let's simple simulate "Screen Refresh": Fade out slowly, Flash in when scanline passes?
            // Let's just fade the group out over persistence, and reset it at start of scan?
            // Close enough for demo.
            
            rasterGroup.attr("opacity", 1);
            rasterGroup.transition()
                .duration(persistence + scanDuration) // Stays visible while scanning + persistence
                .ease(d3.easeLinear)
                .attr("opacity", 0.2); // Don't go fully black in raster usually, ghosting remains

            scanline.attr("y1", 0).attr("y2", 0)
                .transition()
                .duration(scanDuration)
                .ease(d3.easeLinear)
                .attr("y1", height).attr("y2", height)
                .on("end", runScanline);
        };
        runScanline();
    }

    return () => {
        isMounted = false;
        svg.selectAll("*").interrupt();
    };

  }, [dimensions, mode, contentMode, customPoints, customText, beamSpeed, persistence]);

  return (
    <div ref={containerRef} className="w-full h-80 md:h-[500px] relative group select-none animate-flicker">
      {/* CRT Frame */}
      <div className="absolute inset-0 bg-[#050505] rounded-[3rem] shadow-[inset_0_0_40px_rgba(0,0,0,0.8),0_0_0_15px_#1a1a1a] overflow-hidden border-4 border-[#2a2a2a]">
        
        {/* Screen Effects */}
        <div className="absolute inset-0 rounded-[3rem] shadow-[inset_0_0_100px_rgba(0,0,0,0.9)] z-20 pointer-events-none mix-blend-hard-light opacity-50 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),rgba(255,255,255,0)_60%)]"></div>
        <div className="absolute inset-0 rounded-[3rem] bg-[radial-gradient(circle,transparent_60%,black_100%)] z-10 pointer-events-none"></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 pointer-events-none bg-[length:100%_4px,3px_100%] opacity-60"></div>
        
        {/* Interaction Layer */}
        <div 
            className={`absolute inset-0 z-40 ${contentMode === ContentMode.DRAW ? 'cursor-crosshair' : ''}`} 
            onClick={handleSvgClick}
        ></div>

        {/* SVG Layer */}
        <svg ref={svgRef} width="100%" height="100%" className="relative z-0 rounded-[2.5rem]" />
      </div>
      
      {/* Badge */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 bg-black/80 px-3 py-1 rounded text-[10px] font-mono text-vector-green border border-vector-dim uppercase tracking-widest opacity-70 pointer-events-none flex gap-2">
        <span>{contentMode}</span>
        <span className="text-gray-500">|</span>
        <span>{mode}</span>
      </div>
    </div>
  );
};

export default RetroScreen;