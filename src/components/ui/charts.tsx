import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export function Charts({ chartData }: { chartData: any }) {
  if (!chartData) return null;
  
  return (
    <div className="w-full max-w-3xl mx-auto p-4">
      <Bar data={chartData.data} options={chartData.options} />
    </div>
  );
}
