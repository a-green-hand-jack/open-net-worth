export function Example({ flag, translate }: { flag: boolean; translate: (key: string) => string }) {
  return <div className={flag ? 'active' : 'inactive'}>{flag && translate('key')}</div>
}
