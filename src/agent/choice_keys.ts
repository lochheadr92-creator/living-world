// Decision-local public identities. Underlying simulation keys retain their
// plan/cooldown semantics; materially different duplicate offers stay separate.
export function choiceKeys(options: readonly {key: string}[]): string[] {
 const used = new Set(options.map(o=>o.key));
 const counts = new Map<string,number>();
 for(const o of options) counts.set(o.key,(counts.get(o.key)??0)+1);
 return options.map((o,index)=>{
  if(counts.get(o.key)===1) return o.key;
  let key=`${o.key}#choice:${index}`;
  while(used.has(key)) key+=':';
  used.add(key);return key;
 });
}
