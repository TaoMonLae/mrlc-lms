import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/utils";

interface DataPoint {
  date: string;
  value: number;
  label?: string;
}

interface TrendChartProps {
  data: DataPoint[];
  title: string;
  description?: string;
  type?: "line" | "area" | "bar";
  color?: string;
  showTrend?: boolean;
  height?: number;
  className?: string;
  formatValue?: (value: number) => string;
}

export function TrendChart({
  data,
  title,
  description,
  type = "line",
  color = "#3b82f6",
  showTrend = true,
  height = 300,
  className,
  formatValue = (value) => value.toLocaleString(),
}: TrendChartProps) {
  const calculateTrend = () => {
    if (data.length < 2) return null;

    const first = data[0].value;
    const last = data[data.length - 1].value;
    const change = ((last - first) / first) * 100;

    return {
      value: Math.abs(change),
      direction: change > 0 ? "up" : change < 0 ? "down" : "neutral",
    };
  };

  const trend = calculateTrend();

  const getTrendIcon = () => {
    if (!trend) return null;
    switch (trend.direction) {
      case "up":
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case "down":
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      case "neutral":
        return <Minus className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTrendColor = () => {
    if (!trend) return "text-gray-600";
    switch (trend.direction) {
      case "up":
        return "text-green-600";
      case "down":
        return "text-red-600";
      case "neutral":
        return "text-gray-600";
    }
  };

  const chartData = data.map((point) => ({
    ...point,
    formattedValue: formatValue(point.value),
  }));

  const renderChart = () => {
    switch (type) {
      case "area":
        return (
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id={`colorGradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => formatValue(value)} />
            <Tooltip
              formatter={(value: any) => [formatValue(value), "Value"]}
              labelStyle={{ color: "#000" }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              fill={`url(#colorGradient-${color})`}
            />
          </AreaChart>
        );

      case "bar":
        return (
          <BarChart data={chartData}>
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => formatValue(value)} />
            <Tooltip
              formatter={(value: any) => [formatValue(value), "Value"]}
              labelStyle={{ color: "#000" }}
            />
            <Bar dataKey="value" fill={color} radius={[8, 8, 0, 0]} />
          </BarChart>
        );

      default:
        return (
          <LineChart data={chartData}>
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => formatValue(value)} />
            <Tooltip
              formatter={(value: any) => [formatValue(value), "Value"]}
              labelStyle={{ color: "#000" }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={{ fill: color, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        );
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
            </div>
          {showTrend && trend && (
            <div className={cn("flex items-center gap-2", getTrendColor())}>
              {getTrendIcon()}
              <span className="text-sm font-medium">
                {trend.value.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          {renderChart()}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// Multi-line trend chart for comparing multiple metrics
interface MultiTrendChartProps {
  data: Array<{
    date: string;
    [key: string]: string | number;
  }>;
  title: string;
  series: Array<{
    key: string;
    name: string;
    color: string;
  }>;
  description?: string;
  height?: number;
  className?: string;
  formatValue?: (value: number) => string;
}

export function MultiTrendChart({
  data,
  title,
  series,
  description,
  height = 300,
  className,
  formatValue = (value) => value.toLocaleString(),
}: MultiTrendChartProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data}>
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => formatValue(value as number)} />
            <Tooltip
              formatter={(value: any, name: string) => [
                formatValue(value),
                name,
              ]}
              labelStyle={{ color: "#000" }}
            />
            {series.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                stroke={s.color}
                strokeWidth={2}
                dot={{ fill: s.color, r: 4 }}
                activeDot={{ r: 6 }}
                name={s.name}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// Small sparkline chart for embedding in cards
interface SparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  showTrend?: boolean;
}

export function Sparkline({
  data,
  color = "#3b82f6",
  width = 100,
  height = 40,
  showTrend = false,
}: SparklineProps) {
  const calculateTrend = () => {
    if (data.length < 2) return null;
    const first = data[0];
    const last = data[data.length - 1];
    return ((last - first) / first) * 100;
  };

  const trend = showTrend ? calculateTrend() : null;

  const chartData = data.map((value, index) => ({
    index: index.toString(),
    value,
  }));

  return (
    <div className="flex items-center gap-2">
      <ResponsiveContainer width={width} height={height}>
        <AreaChart data={chartData}>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            fill={color}
            fillOpacity={0.3}
          />
        </AreaChart>
      </ResponsiveContainer>
      {showTrend && trend !== null && (
        <span
          className={`text-xs font-medium ${
            trend > 0 ? "text-green-600" : trend < 0 ? "text-red-600" : "text-gray-600"
          }`}
        >
          {trend > 0 ? "+" : ""}
          {trend.toFixed(1)}%
        </span>
      )}
    </div>
  );
}
