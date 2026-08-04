import { useState, useEffect } from "react";
import { Plus, ShoppingCart, Package, AlertCircle } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { productApi } from "@/lib/endpoints";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";

const mockProducts = [
  { _id: "1", name: "Whey Protein Isolate (2kg)", category: "supplement", price: 3499, stockQuantity: 18 },
  { _id: "2", name: "Creatine Monohydrate (250g)", category: "supplement", price: 999, stockQuantity: 4 },
  { _id: "3", name: "BCAA Powder (300g)", category: "supplement", price: 1499, stockQuantity: 12 },
  { _id: "4", name: "GYMAI Shaker Bottle", category: "merchandise", price: 399, stockQuantity: 45 },
  { _id: "5", name: "Heavy Duty Lifting Belt", category: "gear", price: 1299, stockQuantity: 2 },
];

const STORAGE_KEY = "gymai.inventory_products";

function getStoredProducts(): any[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return mockProducts;
}

function saveStoredProducts(prods: any[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prods));
  } catch {}
}

export default function Inventory() {
  const user = useAuthStore((s) => s.user);
  const [products, setProducts] = useState<any[]>(() => getStoredProducts());

  const [showAddModal, setShowAddModal] = useState(false);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  const [newProduct, setNewProduct] = useState({
    name: "",
    category: "supplement",
    price: 1999,
    stockQuantity: 20,
  });

  const [saleQuantity, setSaleQuantity] = useState(1);

  const fetchProducts = async () => {
    try {
      const targetGymId = user?.gymId || "65a000000000000000000001";
      const res = await productApi.list(targetGymId);
      const list = Array.isArray(res) ? res : (res as any)?.products || [];
      if (list && list.length > 0) {
        setProducts(list);
        saveStoredProducts(list);
        return;
      }
      setProducts(getStoredProducts());
    } catch {
      setProducts(getStoredProducts());
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [user]);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (user?.gymId) {
        await productApi.add(user.gymId, newProduct);
      }
      const updatedList = [{ ...newProduct, _id: `mock-${Date.now()}` }, ...products];
      setProducts(updatedList);
      saveStoredProducts(updatedList);
      toast.success(`Product ${newProduct.name} added to store!`);
      setShowAddModal(false);
    } catch {
      toast.error("Failed to add product.");
    }
  };

  const handleSellProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    const prodId = selectedProduct._id || selectedProduct.id;

    // Immediately calculate updated stock list
    const updatedList = products.map((p) => {
      const match = (p._id && p._id === prodId) || (p.id && p.id === prodId) || p.name === selectedProduct.name;
      return match
        ? { ...p, stockQuantity: Math.max(0, (p.stockQuantity || 0) - saleQuantity) }
        : p;
    });

    setProducts(updatedList);
    saveStoredProducts(updatedList);

    try {
      if (user?.gymId && prodId && !String(prodId).startsWith("mock-")) {
        await productApi.checkout(prodId, {
          quantity: saleQuantity,
          paymentMethod: "cash",
          notes: `POS over-the-counter sale of ${saleQuantity}x ${selectedProduct.name}`,
        });
      }
    } catch {}

    toast.success(`Sold ${saleQuantity}x ${selectedProduct.name} (₹${(selectedProduct.price * saleQuantity).toLocaleString("en-IN")})`);
    setShowSaleModal(false);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Store & Product Inventory"
        subtitle="Supplements, Gear, & Merchandise Sales"
        backTo="/owner"
        action={
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-(--color-accent) text-white text-sm font-medium px-4 py-2 hover:opacity-90"
          >
            <Plus size={15} /> Add product
          </button>
        }
      />

      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="flex items-center gap-3">
          <Package className="w-8 h-8 text-(--color-accent) shrink-0" />
          <div>
            <p className="text-xs text-(--color-text-faint)">Total Items in Stock</p>
            <p className="text-xl font-semibold text-(--color-text)">
              {products.reduce((acc, p) => acc + (p.stockQuantity || 0), 0)} units
            </p>
          </div>
        </Card>

        <Card className="flex items-center gap-3">
          <ShoppingCart className="w-8 h-8 text-emerald-400 shrink-0" />
          <div>
            <p className="text-xs text-(--color-text-faint)">Inventory Value</p>
            <p className="text-xl font-semibold text-(--color-text)">
              ₹{products.reduce((acc, p) => acc + p.price * (p.stockQuantity || 0), 0).toLocaleString()}
            </p>
          </div>
        </Card>

        <Card className="flex items-center gap-3">
          <AlertCircle className="w-8 h-8 text-amber-400 shrink-0" />
          <div>
            <p className="text-xs text-(--color-text-faint)">Low Stock Warnings</p>
            <p className="text-xl font-semibold text-(--color-text)">
              {products.filter((p) => p.stockQuantity <= 5).length} items
            </p>
          </div>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="divide-y divide-(--color-border-soft)">
          {products.map((p) => (
            <div key={p._id} className="flex items-center justify-between px-4 sm:px-5 py-3.5 hover:bg-(--color-surface-2)/50 transition-colors">
              <div>
                <p className="text-sm font-medium text-(--color-text)">{p.name}</p>
                <p className="text-xs text-(--color-text-faint)">
                  Category: <span className="capitalize">{p.category}</span> · Price: ₹{p.price}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Badge tone={p.stockQuantity <= 5 ? "warn" : "good"}>
                  {p.stockQuantity <= 5 ? `Low Stock (${p.stockQuantity})` : `${p.stockQuantity} in stock`}
                </Badge>
                <button
                  onClick={() => {
                    setSelectedProduct(p);
                    setShowSaleModal(true);
                  }}
                  className="px-3 py-1.5 text-xs font-medium rounded-full bg-(--color-accent) text-white hover:opacity-90 flex items-center gap-1"
                >
                  <ShoppingCart size={13} /> Sell (POS)
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-(--color-surface) border border-(--color-border) rounded-2xl p-5 w-full max-w-md space-y-4">
            <h3 className="text-base font-semibold text-(--color-text)">Add Store Product</h3>
            <form onSubmit={handleAddProduct} className="space-y-3">
              <div>
                <label className="text-xs text-(--color-text-muted)">Product Name</label>
                <input
                  required
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  className="w-full mt-1 p-2 rounded-lg bg-(--color-surface-2) border border-(--color-border) text-sm text-(--color-text) outline-none"
                  placeholder="e.g. Whey Protein Isolate"
                />
              </div>
              <div>
                <label className="text-xs text-(--color-text-muted)">Category</label>
                <select
                  value={newProduct.category}
                  onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                  className="w-full mt-1 p-2 rounded-lg bg-(--color-surface-2) border border-(--color-border) text-sm text-(--color-text) outline-none"
                >
                  <option value="supplement">Supplement</option>
                  <option value="merchandise">Merchandise</option>
                  <option value="gear">Gear & Accessories</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-(--color-text-muted)">Price (₹)</label>
                  <input
                    type="number"
                    required
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: Number(e.target.value) })}
                    className="w-full mt-1 p-2 rounded-lg bg-(--color-surface-2) border border-(--color-border) text-sm text-(--color-text) outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-(--color-text-muted)">Stock Quantity</label>
                  <input
                    type="number"
                    required
                    value={newProduct.stockQuantity}
                    onChange={(e) => setNewProduct({ ...newProduct, stockQuantity: Number(e.target.value) })}
                    className="w-full mt-1 p-2 rounded-lg bg-(--color-surface-2) border border-(--color-border) text-sm text-(--color-text) outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium text-(--color-text-muted)"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 text-xs font-medium rounded-full bg-(--color-accent) text-white">
                  Add Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POS Quick Checkout Sale Modal */}
      {showSaleModal && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-(--color-surface) border border-(--color-border) rounded-2xl p-5 w-full max-w-md space-y-4">
            <h3 className="text-base font-semibold text-(--color-text)">POS Checkout: {selectedProduct.name}</h3>
            <form onSubmit={handleSellProduct} className="space-y-3">
              <div>
                <label className="text-xs text-(--color-text-muted)">Quantity to Sell</label>
                <input
                  type="number"
                  min={1}
                  max={selectedProduct.stockQuantity}
                  value={saleQuantity}
                  onChange={(e) => setSaleQuantity(Number(e.target.value))}
                  className="w-full mt-1 p-2 rounded-lg bg-(--color-surface-2) border border-(--color-border) text-sm text-(--color-text) outline-none"
                />
              </div>
              <p className="text-sm font-medium text-(--color-text)">
                Total Price: <span className="text-(--color-accent-text)">₹{selectedProduct.price * saleQuantity}</span>
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSaleModal(false)}
                  className="px-4 py-2 text-xs font-medium text-(--color-text-muted)"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 text-xs font-medium rounded-full bg-(--color-accent) text-white">
                  Complete POS Sale
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
