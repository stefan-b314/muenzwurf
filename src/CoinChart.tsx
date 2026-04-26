import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

export type ChartDatum = {
  trial: number;
  kopfPercent: number;
  zahlPercent: number;
};

type CoinChartProps = {
  data: ChartDatum[];
  detailLevel: number;
  verticalZoom: number;
  visible: boolean;
  hasStarted: boolean;
};

const DETAIL_FACTORS = [2, 1, 0.8, 0.75, 0.6, 0.5, 0.4, 0.25, 0.2, 0.15, 0.1, 0.08, 0.075, 0.05, 0.04, 0.025, 0.02, 0.0175, 0.014];

function sampleSeries(data: ChartDatum[], detailLevel: number) {
  if (data.length <= 2) {
    return data;
  }

  const factor = DETAIL_FACTORS[Math.max(0, Math.min(detailLevel - 1, DETAIL_FACTORS.length - 1))] ?? 0.1;
  const targetPoints = Math.max(40, Math.min(data.length, Math.round(850 * factor)));
  const step = Math.max(1, Math.ceil(data.length / targetPoints));
  const reduced = data.filter((_, index) => index % step === 0);

  if (reduced.at(-1)?.trial !== data.at(-1)?.trial) {
    reduced.push(data[data.length - 1]!);
  }

  return reduced;
}

export default function CoinChart({ data, detailLevel, verticalZoom, visible, hasStarted }: CoinChartProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const svgElement = svgRef.current;
    if (!svgElement) {
      return;
    }

    const svg = d3.select(svgElement);

    const width = 760;
    const height = 350;
    const margin = { top: 18, right: 24, bottom: 42, left: 48 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const root = svg
      .selectAll<SVGGElement, null>('g.chart-root')
      .data([null])
      .join('g')
      .attr('class', 'chart-root')
      .attr('transform', `translate(${margin.left},${margin.top})`);
    const emptyState = root
      .selectAll<SVGTextElement, null>('text.empty-state')
      .data([null])
      .join('text')
      .attr('class', 'empty-state')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight / 2)
      .attr('fill', '#52606d')
      .attr('font-size', 16)
      .attr('text-anchor', 'middle');
    const chartLayer = root
      .selectAll<SVGGElement, null>('g.chart-layer')
      .data([null])
      .join('g')
      .attr('class', 'chart-layer');
    const xAxisGroup = chartLayer
      .selectAll<SVGGElement, null>('g.x-axis')
      .data([null])
      .join('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${innerHeight})`);
    const yAxisGroup = chartLayer.selectAll<SVGGElement, null>('g.y-axis').data([null]).join('g').attr('class', 'y-axis');
    const referenceLine = chartLayer
      .selectAll<SVGLineElement, null>('line.reference-line')
      .data([null])
      .join('line')
      .attr('class', 'reference-line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('stroke', '#6b7280')
      .attr('stroke-dasharray', '5 5')
      .attr('stroke-width', 1.5);
    const seriesLayer = chartLayer.selectAll<SVGGElement, null>('g.series-layer').data([null]).join('g').attr('class', 'series-layer');
    const legend = chartLayer
      .selectAll<SVGGElement, null>('g.legend')
      .data([null])
      .join('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${innerWidth - 170}, 0)`);

    if (!visible) {
      chartLayer.attr('display', 'none');
      emptyState.attr('display', null).text('Diagramm ist ausgeblendet');
      return;
    }

    if (data.length === 0) {
      chartLayer.attr('display', 'none');
      emptyState.attr('display', hasStarted ? 'none' : null).text('Noch keine Würfe');
      return;
    }

    chartLayer.attr('display', null);
    emptyState.attr('display', 'none');

    const chartData = sampleSeries(data, detailLevel);
    const maxTrial = Math.max(10, data.at(-1)?.trial ?? 10);
    const zoomRange = Math.max(50 / verticalZoom, 2.5);
    const yMin = Math.max(0, 50 - zoomRange);
    const yMax = Math.min(100, 50 + zoomRange);

    const x = d3.scaleLinear().domain([1, maxTrial]).range([0, innerWidth]);
    const y = d3.scaleLinear().domain([yMin, yMax]).nice().range([innerHeight, 0]);

    const xAxis = d3
      .axisBottom(x)
      .ticks(Math.min(10, Math.max(4, Math.round(innerWidth / 80))))
      .tickFormat((value: d3.NumberValue) => `${value}`);
    const yAxis = d3
      .axisLeft(y)
      .ticks(6)
      .tickFormat((value: d3.NumberValue) => `${value}%`);
    const transition = d3.transition().duration(220).ease(d3.easeCubicOut);
    const styleAxis = (group: d3.Selection<SVGGElement, null, SVGGElement, null>) => {
      group.selectAll('text').attr('fill', '#3f4a5a').attr('font-size', 12);
      group.selectAll('line,path').attr('stroke', '#9fb1c8');
    };

    xAxisGroup.transition(transition).call(xAxis);
    yAxisGroup.transition(transition).call(yAxis);
    styleAxis(xAxisGroup);
    styleAxis(yAxisGroup);

    referenceLine.transition(transition).attr('y1', y(50)).attr('y2', y(50));

    const line = d3
      .line<ChartDatum>()
      .x((datum: ChartDatum) => x(datum.trial))
      .curve(d3.curveMonotoneX);

    const items = [
      { label: 'Zahl', color: '#e63946' },
      { label: 'Kopf', color: '#3867d6' },
      { label: 'Erwartung 50 %', color: '#6b7280' },
    ];

    const seriesDefinitions = [
      {
        key: 'zahl',
        color: '#e63946',
        values: chartData,
        yAccessor: (datum: ChartDatum) => y(datum.zahlPercent),
      },
      {
        key: 'kopf',
        color: '#3867d6',
        values: chartData,
        yAccessor: (datum: ChartDatum) => y(datum.kopfPercent),
      },
    ];

    seriesLayer
      .selectAll<SVGPathElement, (typeof seriesDefinitions)[number]>('path.series')
      .data(seriesDefinitions, (datum) => datum.key)
      .join(
        (enter) =>
          enter
            .append('path')
            .attr('class', 'series')
            .attr('fill', 'none')
            .attr('stroke-width', 2.5)
            .attr('stroke', (datum) => datum.color)
            .attr('d', (datum) => line.y(datum.yAccessor)(datum.values)),
        (update) => update,
      )
      .transition(transition)
      .attr('stroke', (datum) => datum.color)
      .attr('d', (datum) => line.y(datum.yAccessor)(datum.values));

    const legendRows = legend.selectAll<SVGGElement, (typeof items)[number]>('g.legend-row').data(items, (datum) => datum.label).join('g').attr('class', 'legend-row');

    legendRows.attr('transform', (_, index) => `translate(0, ${index * 20})`);
    legendRows
      .selectAll<SVGLineElement, (typeof items)[number]>('line')
      .data((datum) => [datum])
      .join('line')
      .attr('x1', 0)
      .attr('x2', 18)
      .attr('y1', 8)
      .attr('y2', 8)
      .attr('stroke', (datum) => datum.color)
      .attr('stroke-width', 3);
    legendRows
      .selectAll<SVGTextElement, (typeof items)[number]>('text')
      .data((datum) => [datum])
      .join('text')
      .attr('x', 26)
      .attr('y', 12)
      .attr('fill', '#3f4a5a')
      .attr('font-size', 12)
      .text((datum) => datum.label);
  }, [data, detailLevel, hasStarted, verticalZoom, visible]);

  return <svg ref={svgRef} className="chart" aria-label="Diagramm der relativen Häufigkeiten" />;
}
