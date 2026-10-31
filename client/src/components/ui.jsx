export function Loading() { return <p className="p-6 text-gray-600">Loading...</p>; }
export function ErrorBox({ message }) { return <div role="alert" className="my-3 rounded border border-red-200 bg-red-50 p-3 text-red-700">{message || 'Something went wrong'}</div>; }
const COLORS = {
  green: 'bg-green-100 text-green-800', blue: 'bg-blue-100 text-blue-800',
  red: 'bg-red-100 text-red-800', yellow: 'bg-yellow-100 text-yellow-800',
  gray: 'bg-gray-100 text-gray-700',
};
export function Badge({ text, color = 'gray' }) {
  return <span className={`rounded-full px-2 py-1 text-xs font-medium ${COLORS[color] || COLORS.gray}`}>{text}</span>;
}
export function ScoreBar({ value = 0 }) {
  const fraction = Math.max(0, Math.min(1, Number(value) || 0));
  return <div className="flex gap-2 items-center"><div className="h-2 w-32 rounded bg-gray-200 overflow-hidden"><div className="h-full bg-blue-600" style={{ width: `${fraction * 100}%` }} /></div><span className="text-sm">{Math.round(fraction * 100)}%</span></div>;
}
export function ExplainBox({ explanation }) {
  if (!explanation) return null;
  return <section className="my-3 rounded border bg-gray-50 p-3">
    <h3 className="font-semibold">Why this recommendation?</h3>
    <p className="text-sm my-2">{explanation.summary}</p>
    {Array.isArray(explanation.factors) && explanation.factors.length > 0 && (
      <table className="w-full text-sm"><thead><tr className="text-left"><th>Factor</th><th>Value</th><th>Weight</th><th>Contribution</th></tr></thead>
      <tbody>{explanation.factors.map((f,i) => <tr key={i} className="border-t"><td>{f.name}</td><td>{f.value}</td><td>{f.weight}</td><td>{f.contribution}</td></tr>)}</tbody></table>
    )}
  </section>;
}
