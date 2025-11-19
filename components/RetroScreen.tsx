import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { DisplayMode, VectorShape } from '../types';

interface RetroScreenProps {
  mode: DisplayMode;
}

// Triangle ship shape
const SHIP_SHAPE: VectorShape = {
  id: 'ship',
  points: [
    { x: 50, y: 20 },
    { x: 80, y: 80 },
    { x: 50, y: 70 },
    { x: 20, y: 80 }
  ],
  closed: true
};

const RetroScreen: React.FC<RetroScreenProps> = ({ mode }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 300 });

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
    window.addEventListener('resize', updateSize);
    updateSize();
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Main D3 Rendering Logic
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous

    const width = dimensions.width;
    const height = dimensions.height;
    const padding = 40;
    
    // Scale setup
    const xScale = d3.scaleLinear().domain([0, 100]).range([padding, width - padding]);
    const yScale = d3.scaleLinear().domain([0, 100]).range([padding, height - padding]);

    // Background grid (faint)
    const gridGroup = svg.append("g").attr("class", "grid").attr("opacity", 0.1);
    
    // Draw Grid
    for(let i = 0; i <= 100; i+=10) {
        gridGroup.append("line")
            .attr("x1", xScale(i)).attr("y1", yScale(0))
            .attr("x2", xScale(i)).attr("y2", yScale(100))
            .attr("stroke", "#39ff14").attr("stroke-width", 1);
        gridGroup.append("line")
            .attr("x1", xScale(0)).attr("y1", yScale(i))
            .attr("x2", xScale(100)).attr("y2", yScale(i))
            .attr("stroke", "#39ff14").attr("stroke-width", 1);
    }

    // Generate path string
    const lineGenerator = d3.line<{x: number, y: number}>()
      .x(d => xScale(d.x))
      .y(d => yScale(d.y));

    if (SHIP_SHAPE.closed) {
      // Close the loop for visual drawing
      const points = [...SHIP_SHAPE.points, SHIP_SHAPE.points[0]];
      
      if (mode === DisplayMode.VECTOR) {
        // --- VECTOR MODE VISUALIZATION ---
        
        // 1. The Object (The "Phosphor" persistence)
        const path = svg.append("path")
          .datum(points)
          .attr("d", lineGenerator)
          .attr("fill", "none")
          .attr("stroke", "#39ff14")
          .attr("stroke-width", 2)
          .attr("stroke-linejoin", "round")
          .attr("filter", "drop-shadow(0 0 4px #39ff14)"); // Glow

        // 2. The Electron Beam (The physical gun movement)
        const totalLength = path.node()?.getTotalLength() || 0;
        
        const beam = svg.append("circle")
          .attr("r", 4)
          .attr("fill", "#ffffff")
          .attr("filter", "drop-shadow(0 0 8px #ffffff)");

        beam.transition()
          .duration(2000)
          .ease(d3.easeLinear)
          .attrTween("transform", function() {
            return function(t) {
              const point = path.node()!.getPointAtLength(t * totalLength);
              return `translate(${point.x},${point.y})`;
            };
          })
          .on("end", function repeat() {
            d3.active(this as any)
                ?.transition().duration(2000).ease(d3.easeLinear)
                .attrTween("transform", function() {
                    return function(t) {
                        const point = path.node()!.getPointAtLength(t * totalLength);
                        return `translate(${point.x},${point.y})`;
                    };
                })
                .on("end", repeat);
          });
          
        // Label
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", height - 20)
            .attr("text-anchor", "middle")
            .attr("fill", "#39ff14")
            .attr("class", "font-mono text-sm")
            .text("VECTOR: DIRECT POINT-TO-POINT");

      } else {
        // --- RASTER MODE VISUALIZATION ---
        
        // 1. The Shape (Rasterized/Pixelated look)
        // We manually create a "step" effect to simulate low res raster
        const rasterPoints: [number, number][] = [];
        // Simulating sampling the lines
        const steps = 40;
        for (let i=0; i<points.length -1; i++) {
            const p1 = points[i];
            const p2 = points[i+1];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            const stepCount = Math.ceil(dist / 2); // density
            for(let s=0; s<=stepCount; s++) {
                rasterPoints.push([
                    p1.x + (dx * s/stepCount),
                    p1.y + (dy * s/stepCount)
                ]);
            }
        }

        svg.selectAll("rect.pixel")
            .data(rasterPoints)
            .enter()
            .append("rect")
            .attr("x", d => xScale(Math.round(d[0]/5)*5) - 2) // Snap to grid
            .attr("y", d => yScale(Math.round(d[1]/5)*5) - 2)
            .attr("width", 4)
            .attr("height", 4)
            .attr("fill", "rgba(57, 255, 20, 0.3)") // Dimmer persistence
            .attr("class", "pixel");

        // 2. The Scanline Beam
        const scanline = svg.append("line")
            .attr("x1", 0)
            .attr("x2", width)
            .attr("y1", 0)
            .attr("y2", 0)
            .attr("stroke", "rgba(255, 255, 255, 0.5)")
            .attr("stroke-width", 2);

        scanline.transition()
            .duration(2000)
            .ease(d3.easeLinear)
            .attr("y1", height)
            .attr("y2", height)
            .on("end", function repeat() {
                d3.select(this)
                    .attr("y1", 0)
                    .attr("y2", 0)
                    .transition()
                    .duration(2000)
                    .ease(d3.easeLinear)
                    .attr("y1", height)
                    .attr("y2", height)
                    .on("end", repeat);
            });
            
         // Highlight pixels when scanline passes
         // (Simplified simulation logic using an interval independent of d3 tween for performance)
         
         // Label
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", height - 20)
            .attr("text-anchor", "middle")
            .attr("fill", "#39ff14")
            .attr("class", "font-mono text-sm")
            .text("RASTER: LINE-BY-LINE SCAN");
      }
    }

  }, [dimensions, mode]);

  return (
    <div ref={containerRef} className="w-full h-64 md:h-96 bg-vector-bg relative border-2 border-vector-dim rounded-lg overflow-hidden shadow-[0_0_20px_rgba(57,255,20,0.1)]">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 pointer-events-none bg-[length:100%_4px,3px_100%] pointer-events-none" />
      <div className="absolute inset-0 animate-flicker z-20 pointer-events-none opacity-10 bg-white mix-blend-overlay"></div>
      <svg ref={svgRef} width="100%" height="100%" className="relative z-0" />
    </div>
  );
};

export default RetroScreen;