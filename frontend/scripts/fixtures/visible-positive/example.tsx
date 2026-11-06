export function Example({ flag, value }: { flag: boolean; value: string }) {
  return <div>{flag && 'Visible condition'}{value || 'Visible fallback'}<span title={`Visible template ${value}`} /></div>
}
