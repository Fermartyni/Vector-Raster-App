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
  onCanvasClick 
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
    const gridGroup = svg.append("g").attr("class", "grid").attr("opacity", 0.15);
    
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
        
        // Draw Paths
        shapesToDraw.forEach(shape => {
            let points = shape.points;
            if (points.length === 0) return;
            if (shape.closed) points = [...points, points[0]];
            
            // The glowy path
            svg.append("path")
                .datum(points)
                .attr("d", lineGenerator)
                .attr("fill", "none")
                .attr("stroke", "#39ff14")
                .attr("stroke-width", 2)
                .attr("stroke-linejoin", "round")
                .attr("stroke-linecap", "round")
                .attr("filter", "drop-shadow(0 0 4px #39ff14)")
                .attr("opacity", 0.9);

            // Draw Vertices for Draw Mode
            if (contentMode === ContentMode.DRAW) {
                svg.selectAll(`.vertex-${shape.id}`)
                    .data(points)
                    .enter()
                    .append("circle")
                    .attr("cx", d => xScale(d.x))
                    .attr("cy", d => yScale(d.y))
                    .attr("r", 3)
                    .attr("fill", "#fff");
            }
        });

        // Beam Animation Logic
        if (shapesToDraw.length > 0) {
            const beam = svg.append("circle")
                .attr("r", 4)
                .attr("fill", "#ffffff")
                .attr("filter", "drop-shadow(0 0 8px #ffffff)")
                .attr("opacity", 0);

            const animateBeam = async () => {
                if (!isMounted) return;

                for (const shape of shapesToDraw) {
                    if (!isMounted) break;
                    let points = shape.points;
                    if (points.length < 1) continue;
                    if (shape.closed) points = [...points, points[0]];

                    // Move to start (Jump)
                    const startX = xScale(points[0].x);
                    const startY = yScale(points[0].y);
                    
                    beam.attr("opacity", 0).attr("cx", startX).attr("cy", startY);
                    
                    // Small delay for "blanking interval"
                    await new Promise(r => setTimeout(r, 50));
                    if (!isMounted) return;

                    beam.attr("opacity", 1);

                    // If it's a single point (like in early draw mode)
                    if (points.length === 1) {
                        await new Promise(r => setTimeout(r, 100));
                        continue;
                    }

                    // Trace path
                    const tempPath = svg.append("path")
                        .datum(points)
                        .attr("d", lineGenerator)
                        .style("opacity", 0);
                    
                    const len = tempPath.node()?.getTotalLength() || 0;
                    tempPath.remove();

                    if (len > 0) {
                        await beam.transition()
                            .duration(len * 3) // Speed based on length
                            .ease(d3.easeLinear)
                            .attrTween("cx", () => (t) => {
                                const p = tempPath.node()?.getPointAtLength(t * len);
                                return p ? p.x.toString() : startX.toString();
                            })
                            .attrTween("cy", () => (t) => {
                                const p = tempPath.node()?.getPointAtLength(t * len);
                                return p ? p.y.toString() : startY.toString();
                            })
                            .end()
                            .catch(() => {}); // Catch interruption errors
                    }
                }

                if (isMounted) {
                    setTimeout(animateBeam, 200);
                }
            };
            animateBeam();
        }

    } else {
        // --- RASTER MODE ---
        // OPTIMIZED: Do not draw 5000 rects. Draw dashed lines to simulate pixels.
        
        shapesToDraw.forEach(shape => {
            let points = shape.points;
            if (points.length === 0) return;
            if (shape.closed) points = [...points, points[0]];

            // Draw a "staircase" line or dashed line to simulate raster
            // We simply use the path but style it to look pixelated
            svg.append("path")
                .datum(points)
                .attr("d", lineGenerator)
                .attr("fill", "none")
                .attr("stroke", "rgba(57, 255, 20, 0.7)")
                .attr("stroke-width", 4)
                .attr("stroke-dasharray", "4, 4") // Pixelated effect
                .attr("stroke-linecap", "butt") 
                .attr("shape-rendering", "crispEdges") // Disable anti-aliasing
                .attr("filter", "drop-shadow(0 0 2px #39ff14)");
        });

        // Raster Scanline Effect
        const scanline = svg.append("line")
            .attr("x1", 0).attr("x2", width)
            .attr("y1", 0).attr("y2", 0)
            .attr("stroke", "rgba(255, 255, 255, 0.3)")
            .attr("stroke-width", 2);

        const runScanline = () => {
            if(!isMounted) return;
            scanline.attr("y1", 0).attr("y2", 0)
                .transition().duration(2000).ease(d3.easeLinear)
                .attr("y1", height).attr("y2", height)
                .on("end", runScanline);
        };
        runScanline();
    }

    return () => {
        isMounted = false;
        svg.selectAll("*").interrupt();
    };

  }, [dimensions, mode, contentMode, customPoints, customText]);

  return (
    <div ref={containerRef} className="w-full h-80 md:h-[500px] relative group select-none">
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
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 bg-black/80 px-3 py-1 rounded text-[10px] font-mono text-vector-green border border-vector-dim uppercase tracking-widest opacity-70 pointer-events-none">
        {contentMode} : {mode}
      </div>
    </div>
  );
};

export default RetroScreen;