import type { MacroData } from '../../types';
import MacroDashboard from '../common/MacroDashboard';

interface Props {
  macroData: MacroData | null;
}

export default function MacroWidget({ macroData }: Props) {
  if (!macroData) {
    return <p className="text-xs t-muted p-2">Macro data unavailable. Set FRED_API_KEY in ETL.</p>;
  }

  return (
    <div className="p-1 overflow-auto h-full">
      <MacroDashboard data={macroData} compact />
    </div>
  );
}
