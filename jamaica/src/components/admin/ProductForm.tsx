"use client";
import { startTransition, useActionState, useState } from "react";
import { saveProduct } from "@/app/actions/products";

type P = {
  id?: string; name?: string; slug?: string; category_id?: string; description?: string; details?: string; price_cents?: number; sale_price_cents?: number | null;
  status?: string; gender?: string; featured?: boolean; is_new?: boolean; outfit_slot?: string | null; tryon_category?: string | null; weight_grams?: number;
};

const reais = (c?: number | null) => (c == null ? "" : (c / 100).toFixed(2).replace(".", ","));

export function ProductForm({ product = {}, categories }: { product?: P; categories: { id: string; name: string; department: string }[] }) {
  const [state, run, pending] = useActionState(saveProduct, {});
  const [name, setName] = useState(product.name ?? "");
  const f = state.fields ?? {};
  const val = (k: string, d: string) => (k in f ? f[k] : d);

  return (
    <form
      className="grid gap-5 md:grid-cols-2"
      onSubmit={(e) => {
        // Submit without React's automatic form reset, so a validation error keeps what was typed.
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => run(data));
      }}
    >
      {product.id && <input type="hidden" name="id" value={product.id} />}
      <label className="md:col-span-2">
        <span className="label">Name</span>
        <input name="name" required className="field" value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label>
        <span className="label">Web address</span>
        <span className="flex items-center bg-stone"><span className="pl-3 text-muted">/p/</span><input name="slug" defaultValue={val("slug", product.slug ?? "")} placeholder={name ? name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") : "made-from-the-name"} className="field pl-1" aria-describedby="slug-hint" /></span>
        <span id="slug-hint" className="hint block">Leave empty to make it from the name.</span>
      </label>
      <label>
        <span className="label">Category</span>
        <select name="category_id" required defaultValue={val("category_id", product.category_id ?? "")} className="field">
          <option value="" disabled>Choose…</option>
          {["fashion", "accessories", "footwear"].map((d) => (
            <optgroup key={d} label={d[0].toUpperCase() + d.slice(1)}>
              {categories.filter((c) => c.department === d).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </optgroup>
          ))}
        </select>
      </label>
      <label>
        <span className="label">Price (R$)</span>
        <input name="price" inputMode="decimal" required defaultValue={val("price", reais(product.price_cents))} placeholder="349,90" className="field tabular" />
      </label>
      <label>
        <span className="label">Promotional price (R$)</span>
        <input name="sale_price" inputMode="decimal" defaultValue={val("sale_price", reais(product.sale_price_cents))} placeholder="Leave empty for no promotion" className="field tabular" aria-describedby="sale-hint" />
        <span id="sale-hint" className="hint block">Must be lower than the price. Shown with the original struck through.</span>
      </label>
      <label className="md:col-span-2">
        <span className="label">Description</span>
        <textarea name="description" rows={3} defaultValue={val("description", product.description ?? "")} className="field" />
      </label>
      <label className="md:col-span-2">
        <span className="label">Materials and care</span>
        <textarea name="details" rows={3} defaultValue={val("details", product.details ?? "")} className="field" aria-describedby="details-hint" />
        <span id="details-hint" className="hint block">One fact per line, for example “100% cotton”.</span>
      </label>
      <label>
        <span className="label">Status</span>
        <select name="status" defaultValue={val("status", product.status ?? "draft")} className="field">
          <option value="draft">Draft: hidden from the store</option>
          <option value="active">Active: on sale</option>
          <option value="archived">Archived: hidden, kept for order history</option>
        </select>
      </label>
      <label>
        <span className="label">Who it’s for</span>
        <select name="gender" defaultValue={val("gender", product.gender ?? "unisex")} className="field">
          <option value="unisex">Everyone</option>
          <option value="women">Women</option>
          <option value="men">Men</option>
        </select>
      </label>
      <label>
        <span className="label">Place in the outfit builder</span>
        <select name="outfit_slot" defaultValue={val("outfit_slot", product.outfit_slot ?? "")} className="field">
          <option value="">Not offered in the outfit builder</option>
          <option value="top">Top</option>
          <option value="outerwear">Jacket or outer layer</option>
          <option value="bottom">Bottoms</option>
          <option value="one-piece">Dress or one-piece</option>
          <option value="shoes">Shoes</option>
          <option value="watch">Watch</option>
          <option value="eyewear">Sunglasses</option>
          <option value="accessory">Other accessory</option>
        </select>
      </label>
      <label>
        <span className="label">Virtual try-on</span>
        <select name="tryon_category" defaultValue={val("tryon_category", product.tryon_category ?? "")} className="field">
          <option value="">Not available for try-on</option>
          <option value="tops">Worn on the upper body</option>
          <option value="bottoms">Worn on the lower body</option>
          <option value="one-pieces">Full body (dress, set)</option>
        </select>
      </label>
      <label>
        <span className="label">Shipping weight (grams)</span>
        <input name="weight_grams" type="number" min={1} defaultValue={val("weight_grams", String(product.weight_grams ?? 500))} className="field tabular" />
      </label>
      <div className="flex flex-col justify-end gap-2 pb-2">
        <label className="flex items-center gap-3"><input type="checkbox" name="featured" defaultChecked={product.featured} className="h-5 w-5 accent-emerald" /> Featured in the store</label>
        <label className="flex items-center gap-3"><input type="checkbox" name="is_new" defaultChecked={product.is_new} className="h-5 w-5 accent-emerald" /> Mark as new</label>
      </div>
      <div className="flex items-center gap-4 md:col-span-2">
        <button type="submit" className="btn" disabled={pending}>{pending ? "Saving…" : product.id ? "Save changes" : "Create product"}</button>
        <p aria-live="polite" className={state.error ? "error-text mt-0" : "text-small font-semibold text-emerald"}>{state.error ?? state.message}</p>
      </div>
    </form>
  );
}
