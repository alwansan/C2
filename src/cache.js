export class AsyncCache {
  constructor(max = 128) { this.max=max; this.items=new Map(); this.pending=new Map(); }
  async get(key, ttl, load) {
    const cached=this.items.get(key);
    if (cached && cached.expires>Date.now()) { this.items.delete(key); this.items.set(key,cached); return cached.value; }
    if (this.pending.has(key)) return this.pending.get(key);
    const promise=Promise.resolve().then(load).then(value=>{
      this.items.set(key,{value,expires:Date.now()+ttl});
      while(this.items.size>this.max) this.items.delete(this.items.keys().next().value);
      return value;
    }).finally(()=>this.pending.delete(key));
    this.pending.set(key,promise); return promise;
  }
  clear() { this.items.clear(); }
}
