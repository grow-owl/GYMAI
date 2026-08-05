import { useState, useEffect } from "react";
import { Plus, ShoppingCart, Package, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import CustomSelect from "@/components/ui/CustomSelect";
import Modal from "@/components/ui/Modal";
import { productApi, memberApi } from "@/lib/endpoints";
import { useGymBranch } from "@/hooks/useGymBranch";
import { toast } from "sonner";

const categoryOptions = [
  { value: "supplement", label: "Supplement" },
  { value: "merchandise", label: "Merchandise" },
  { value: "gear", label: "Gear & Accessories" },
  { value: "service_package", label: "Service Package" },
];

const paymentMethodOptions = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI / QR Code" },
  { value: "card", label: "Credit / Debit Card" },
  { value: "bank_transfer", label: "Bank Transfer" },
];

export default function Inventory() {
  const { gymId, branchId, loading: resolvingBranch } = useGymBranch();
  const [products, setProducts] = useState<any[]>([]);
  const [membersList, setMembersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Clear old cached mock localStorage items on mount
  useEffect(() => {
    try {
      localStorage.removeItem("gymai.inventory_products");
    } catch {}
  }, []);

  const [showAddModal, setShowAddModal] = useState(false);
  const [submittingAdd, setSubmittingAdd] = useState(false);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [submittingSale, setSubmittingSale] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  const [newProduct, setNewProduct] = useState({
    name: "",
    category: "supplement",
    price: 1999,
    stockQuantity: 20,
  });

  const [saleQuantity, setSaleQuantity] = useState(1);
  const [saleMemberId, setSaleMemberId] = useState("walk_in");
  const [salePaymentMethod, setSalePaymentMethod] = useState("cash");
  const [walkInCustomerName, setWalkInCustomerName] = useState("");

  const fetchProducts = async () => {
    if (!gymId) {
      setProducts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [prodRes, memRes] = await Promise.all([
        productApi.list(gymId).catch(() => []),
        memberApi.list(gymId, branchId || "").catch(() => []),
      ]);

      const list = Array.isArray(prodRes) ? prodRes : (prodRes as any)?.products || [];
      setProducts(list);

      let mList = Array.isArray(memRes) ? memRes : (memRes as any)?.members || [];
      if (mList.length === 0) {
        const fallbackRes = await memberApi.list(gymId, "").catch(() => null);
        mList = Array.isArray(fallbackRes) ? fallbackRes : (fallbackRes as any)?.members || [];
      }
      setMembersList(mList);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [gymId, branchId]);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeGymId = gymId || "";
    setSubmittingAdd(true);
    try {
      await productApi.add(activeGymId, {
        ...newProduct,
        price: Number(newProduct.price),
        stockQuantity: Number(newProduct.stockQuantity),
      });
      toast.success(`Product ${newProduct.name} added to store!`);
      setShowAddModal(false);
      setNewProduct({ name: "", category: "supplement", price: 1999, stockQuantity: 20 });
      fetchProducts();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || err.response?.data?.message || err.message || "Failed to add product.");
    } finally {
      setSubmittingAdd(false);
    }
  };

  const handleSellProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    const prodId = selectedProduct._id || selectedProduct.id;
    const targetMember = saleMemberId === "walk_in" ? undefined : saleMemberId;

    let formattedCustomerName: string | undefined;
    if (saleMemberId === "walk_in") {
      const trimmed = walkInCustomerName.trim();
      if (trimmed) {
        formattedCustomerName = trimmed.toLowerCase().includes("(walk-in)") ? trimmed : `${trimmed} (Walk-in)`;
      } else {
        formattedCustomerName = "Walk-in Customer";
      }
    }

    setSubmittingSale(true);
    try {
      await productApi.checkout(prodId, {
        quantity: Number(saleQuantity),
        memberId: targetMember,
        customerName: formattedCustomerName,
        paymentMethod: salePaymentMethod,
        notes: `Purchased ${saleQuantity}x ${selectedProduct.name}`,
      } as any);
      toast.success(`Sold ${saleQuantity}x ${selectedProduct.name}! Payment recorded.`);
      setShowSaleModal(false);
      setSelectedProduct(null);
      setWalkInCustomerName("");
      fetchProducts();
      window.dispatchEvent(new CustomEvent("gymai-payments-updated"));
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to process store sale.");
    } finally {
      setSubmittingSale(false);
    }
  };

  const totalStock = products.reduce((acc, item) => acc + (item.stockQuantity || 0), 0);
  const totalValue = products.reduce((acc, item) => acc + (item.price || 0) * (item.stockQuantity || 0), 0);
  const lowStockCount = products.filter((item) => (item.stockQuantity || 0) <= 5).length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Store & Product Inventory"
        subtitle="Supplements, Gear, & Merchandise Sales"
        backTo="/owner"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={fetchProducts}
              className="inline-flex items-center gap-1 text-xs text-(--color-text-muted) hover:text-(--color-text) p-2 rounded-lg bg-(--color-surface-2)"
              title="Refresh Products"
            >
              <RefreshCw size={14} className={loading ? "animate-spin text-(--color-accent)" : ""} />
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-(--color-accent) text-white text-sm font-medium px-4 py-2 hover:opacity-90"
            >
              <Plus size={15} /> Add product
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="flex items-center gap-3">
          <div className="p-3 rounded-full bg-amber-500/10 text-amber-400">
            <Package size={20} />
          </div>
          <div>
            <p className="text-xs text-(--color-text-muted)">Total Items in Stock</p>
            <p className="font-display text-lg font-semibold text-(--color-text)">{totalStock} units</p>
          </div>
        </Card>

        <Card className="flex items-center gap-3">
          <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-400">
            <ShoppingCart size={20} />
          </div>
          <div>
            <p className="text-xs text-(--color-text-muted)">Inventory Value</p>
            <p className="font-display text-lg font-semibold text-(--color-text)">₹{totalValue.toLocaleString("en-IN")}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-3">
          <div className="p-3 rounded-full bg-rose-500/10 text-rose-400">
            <AlertCircle size={20} />
          </div>
          <div>
            <p className="text-xs text-(--color-text-muted)">Low Stock Warnings</p>
            <p className="font-display text-lg font-semibold text-rose-400">{lowStockCount} items</p>
          </div>
        </Card>
      </div>

      {resolvingBranch || loading ? (
        <Card className="flex items-center justify-center p-12 text-sm text-(--color-text-muted) gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-(--color-accent)" /> Loading store products...
        </Card>
      ) : products.length === 0 ? (
        <Card className="text-center py-12 text-(--color-text-muted) space-y-2">
          <Package className="w-8 h-8 mx-auto text-(--color-text-faint)" />
          <p className="text-sm font-medium text-(--color-text)">No products in store inventory</p>
          <p className="text-xs text-(--color-text-muted)">Click "Add product" to list supplements and merchandise.</p>
        </Card>
      ) : (
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {products.map((p) => {
              const stock = p.stockQuantity || 0;
              const isLow = stock <= 5;
              return (
                <div key={p._id || p.id} className="p-3.5 rounded-xl border border-(--color-border) bg-(--color-surface-2)/40 flex items-center justify-between gap-3">
                  <div>
                    <h4 className="font-display text-sm font-semibold text-(--color-text)">{p.name}</h4>
                    <p className="text-xs text-(--color-text-muted) capitalize mt-0.5">
                      {p.category} · <span className="font-mono text-emerald-400 font-medium">₹{(p.price || 0).toLocaleString("en-IN")}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge tone={isLow ? "warn" : "good"}>
                      {isLow ? `Low Stock (${stock})` : `${stock} in stock`}
                    </Badge>
                    <button
                      onClick={() => {
                        setSelectedProduct(p);
                        setSaleQuantity(1);
                        setSaleMemberId("walk_in");
                        setSalePaymentMethod("cash");
                        setShowSaleModal(true);
                      }}
                      className="px-3 py-1.5 rounded-full bg-(--color-accent) text-white text-xs font-semibold hover:opacity-90 transition-opacity"
                    >
                      Sell (POS)
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Add Product Modal */}
      {showAddModal && (
        <Modal onClose={() => setShowAddModal(false)} maxWidth="md" title="Add Store Product">
          <form onSubmit={handleAddProduct} className="space-y-4">
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-(--color-text-muted) mb-1 font-medium">Product Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Whey Protein Isolate (2kg)"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  className="w-full rounded-xl bg-(--color-surface-2) p-2.5 text-sm text-(--color-text) border border-(--color-border) focus:outline-none focus:border-(--color-accent)"
                />
              </div>

              <div>
                <CustomSelect
                  label="Category"
                  value={newProduct.category}
                  onChange={(val) => setNewProduct({ ...newProduct, category: val })}
                  options={categoryOptions}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-(--color-text-muted) mb-1 font-medium">Price (₹)</label>
                  <input
                    type="number"
                    required
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: Number(e.target.value) })}
                    className="w-full rounded-xl bg-(--color-surface-2) p-2.5 text-sm text-(--color-text) border border-(--color-border)"
                  />
                </div>
                <div>
                  <label className="block text-(--color-text-muted) mb-1 font-medium">Stock Quantity</label>
                  <input
                    type="number"
                    required
                    value={newProduct.stockQuantity}
                    onChange={(e) => setNewProduct({ ...newProduct, stockQuantity: Number(e.target.value) })}
                    className="w-full rounded-xl bg-(--color-surface-2) p-2.5 text-sm text-(--color-text) border border-(--color-border)"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-(--color-surface-2) text-xs font-semibold text-(--color-text)"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingAdd}
                className="flex-1 py-2.5 rounded-xl bg-(--color-accent) text-white text-xs font-bold shadow-md flex items-center justify-center gap-1.5"
              >
                {submittingAdd ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Product"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* POS Sale Modal */}
      {showSaleModal && selectedProduct && (
        <Modal
          onClose={() => {
            setShowSaleModal(false);
            setSelectedProduct(null);
          }}
          maxWidth="md"
          title={`Record Sale: ${selectedProduct.name}`}
        >
          <form onSubmit={handleSellProduct} className="space-y-4">
            <div className="space-y-3 text-xs">
              <div>
                <CustomSelect
                  label="Select Customer / Member"
                  value={saleMemberId}
                  onChange={(val) => setSaleMemberId(val)}
                  options={[
                    { value: "walk_in", label: "Walk-in Customer (General)" },
                    ...membersList.map((m) => {
                      const mId = m._id || m.id;
                      const name = m.fullName || m.name || m.userId?.fullName || "Member";
                      const phone = m.phone || m.userId?.phone || "";
                      return { label: `${name} ${phone ? `(${phone})` : ""}`, value: String(mId) };
                    }),
                  ]}
                />
              </div>

              {saleMemberId === "walk_in" && (
                <div>
                  <label className="block text-(--color-text-muted) mb-1 font-medium">Walk-in Customer Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Kumar"
                    value={walkInCustomerName}
                    onChange={(e) => setWalkInCustomerName(e.target.value)}
                    className="w-full rounded-xl bg-(--color-surface-2) p-2.5 text-sm text-(--color-text) border border-(--color-border) focus:outline-none focus:border-(--color-accent)"
                  />
                  <p className="text-[10px] text-(--color-text-muted) mt-1">
                    System will automatically save this as <span className="font-semibold text-(--color-accent)">"{walkInCustomerName.trim() ? `${walkInCustomerName.trim()} (Walk-in)` : 'Walk-in Customer'}"</span> in billing database.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-(--color-text-muted) mb-1 font-medium">Quantity to Sell</label>
                  <input
                    type="number"
                    min="1"
                    max={selectedProduct.stockQuantity || 99}
                    value={saleQuantity}
                    onChange={(e) => setSaleQuantity(Math.max(1, Number(e.target.value)))}
                    className="w-full rounded-xl bg-(--color-surface-2) p-2.5 text-sm text-(--color-text) border border-(--color-border)"
                  />
                </div>

                <div>
                  <CustomSelect
                    label="Payment Method"
                    value={salePaymentMethod}
                    onChange={(val) => setSalePaymentMethod(val)}
                    options={paymentMethodOptions}
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-(--color-surface-2) text-xs space-y-1">
                <p className="flex justify-between">
                  <span className="text-(--color-text-muted)">Unit Price:</span>
                  <span className="font-mono font-medium text-(--color-text)">₹{(selectedProduct.price || 0).toLocaleString("en-IN")}</span>
                </p>
                <p className="flex justify-between text-sm font-bold text-emerald-400 pt-1 border-t border-(--color-border)">
                  <span>Total Amount:</span>
                  <span className="font-mono">₹{((selectedProduct.price || 0) * saleQuantity).toLocaleString("en-IN")}</span>
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setShowSaleModal(false);
                  setSelectedProduct(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-(--color-surface-2) font-semibold text-(--color-text)"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingSale}
                className="flex-1 py-2.5 rounded-xl bg-(--color-accent) text-white font-bold shadow-md flex items-center justify-center gap-1.5"
              >
                {submittingSale ? <Loader2 className="w-4 h-4 animate-spin" /> : "Complete Sale"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
