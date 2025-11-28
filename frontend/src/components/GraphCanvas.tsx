import * as d3 from "d3";
import { useEffect, useRef, useState } from "react";

type NodeT = { id: string; text: string; user: string };
type LinkT = { source: string; target: string; similarity: number };
type UpdatePayload = {
  node: { id: string; session_id: string; user: string; text: string };
  links: LinkT[];
};
type SimNode = NodeT & { x?: number; y?: number; vx?: number; vy?: number; fx?: number|null; fy?: number|null };

export default function GraphCanvas({ updates }: { updates: UpdatePayload[] }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [nodes, setNodes] = useState<NodeT[]>([]);
  const [links, setLinks] = useState<LinkT[]>([]);

  useEffect(() => {
    if (updates.length === 0) return;
    const last = updates[updates.length - 1];

    setNodes((prev) => (!prev.find((n) => n.id === last.node.id)
      ? [...prev, { id: last.node.id, text: last.node.text, user: last.node.user }]
      : prev));

    setLinks((prev) => {
      const merged = [...prev];
      for (const l of last.links) {
        if (!merged.find((x) => x.source === l.source && x.target === l.target)) merged.push(l);
      }
      return merged;
    });
  }, [updates]);

  useEffect(() => {
    if (!svgRef.current) return;
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const simNodes: SimNode[] = nodes.map((n) => ({ ...n }));
    const simulation = d3
      .forceSimulation(simNodes as any)
      .force("link", d3.forceLink(links as any).id((d: any) => d.id).distance(120))
      .force("charge", d3.forceManyBody().strength(-220))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const link = svg
      .append("g").attr("stroke", "#ccc")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", (d: LinkT) => 1 + 2 * d.similarity);

    const node = svg
      .append("g")
      .selectAll("circle")
      .data(simNodes)
      .join("circle")
      .attr("r", 10)
      .attr("fill", "#69b3a2")
      .call(
        d3.drag<any, any>()
          .on("start", (event: any, d: SimNode) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x ?? null; d.fy = d.y ?? null;
          })
          .on("drag", (event: any, d: SimNode) => { d.fx = event.x; d.fy = event.y; })
          .on("end",  (event: any, d: SimNode) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null; d.fy = null;
          })
      );

    const labels = svg
      .append("g")
      .selectAll("text")
      .data(simNodes)
      .join("text")
      .text((d) => (d.text.length > 24 ? d.text.slice(0, 24) + "" : d.text))
      .attr("font-size", 12)
      .attr("fill", "#333");

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => (d.source as any).x)
        .attr("y1", (d: any) => (d.source as any).y)
        .attr("x2", (d: any) => (d.target as any).x)
        .attr("y2", (d: any) => (d.target as any).y);

      node.attr("cx", (d: SimNode) => d.x ?? 0).attr("cy", (d: SimNode) => d.y ?? 0);
      labels.attr("x", (d: SimNode) => (d.x ?? 0) + 12).attr("y", (d: SimNode) => (d.y ?? 0) + 4);
    });
  }, [nodes, links]);

  return <svg ref={svgRef} width="100%" height="100%" />;
}
