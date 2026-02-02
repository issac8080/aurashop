"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Scan, Package, Check, X, Store, Truck, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";

const API = "/api";

type Availability = {
  found: boolean;
  product_id?: string;
  product_name?: string;
  in_stock: boolean;
  current_store_id?: string;
  other_stores_with_stock: Array<{ id: string; name: string; address: string }>;
  deliver_online: boolean;
};

type Order = {
  id: string;
  items: Array<{ product_id: string; quantity: number; price: number }>;
  total: number;
  status: string;
  store_location?: string;
};

const STORES = [
  { id: "store_1", name: "AuraShop Downtown" },
  { id: "store_2", name: "AuraShop Mall" },
  { id: "store_3", name: "AuraShop Express" },
];

export default function StoreScannerPage() {
  const [qrCode, setQrCode] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);

  const [productId, setProductId] = useState("");
  const [currentStoreId, setCurrentStoreId] = useState("store_1");
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [availLoading, setAvailLoading] = useState(false);
  const [availError, setAvailError] = useState("");

  const handleVerify = async () => {
    if (!qrCode.trim()) return;
    setLoading(true);
    setError("");
    setOrder(null);
    setCompleted(false);

    try {
      // First try as QR code
      let res = await fetch(`${API}/pickup/verify?qr_code=${encodeURIComponent(qrCode)}`);
      
      // If QR code fails and input looks like an order ID, try direct order lookup
      if (!res.ok && qrCode.startsWith("ORD-")) {
        res = await fetch(`${API}/orders/${qrCode}`);
        if (res.ok) {
          const data = await res.json().catch(() => null);
          if (data?.delivery_method === "store_pickup") {
            setOrder(data);
            setLoading(false);
            return;
          }
        }
      }
      if (!res.ok) throw new Error("Invalid QR code");
      const data = await res.json().catch(() => null);
      if (!data) throw new Error("Invalid response");
      setOrder(data);
    } catch {
      setError("Invalid QR code or order not found. Please check the code and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!order) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/pickup/complete/${order.id}`, { method: "POST" });
      if (res.ok) {
        setCompleted(true);
        setTimeout(() => {
          setOrder(null);
          setQrCode("");
          setCompleted(false);
        }, 3000);
      }
    } catch {
      alert("Failed to complete pickup");
    } finally {
      setLoading(false);
    }
  };

  const checkAvailability = async () => {
    if (!productId.trim()) return;
    setAvailLoading(true);
    setAvailError("");
    setAvailability(null);
    try {
      const url = `${API}/products/${encodeURIComponent(productId.trim())}/availability?store=${encodeURIComponent(currentStoreId)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Product not found");
      const data: Availability = await res.json();
      setAvailability(data);
    } catch {
      setAvailError("Product not found or invalid ID.");
    } finally {
      setAvailLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-emerald-500/5 py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 mb-4">
            <Scan className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Store Pickup Scanner</h1>
          <p className="text-muted-foreground mt-2">Scan customer QR code to verify and complete pickup</p>
        </motion.div>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>Scan QR Code</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-medium">Enter QR Code or Order ID</label>
              <div className="flex gap-2">
                <Input
                  placeholder="ORD-ABC12345 or scan QR code"
                  value={qrCode}
                  onChange={(e) => setQrCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                  className="font-mono"
                />
                <Button onClick={handleVerify} disabled={loading || !qrCode.trim()}>
                  {loading ? "Verifying..." : "Verify"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Scan the QR code or manually enter the Order ID shown on customer's phone
              </p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-lg bg-red-500/10 border border-red-500/20 p-4 flex items-center gap-3"
              >
                <X className="h-5 w-5 text-red-600" />
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </motion.div>
            )}

            {completed && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-6 text-center"
              >
                <Check className="h-12 w-12 mx-auto text-emerald-600 mb-3" />
                <p className="font-semibold text-lg">Pickup Completed!</p>
                <p className="text-sm text-muted-foreground mt-1">Order has been handed over to customer</p>
              </motion.div>
            )}

            {order && !completed && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Check className="h-5 w-5 text-emerald-600" />
                    <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                      Order Verified
                    </p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Order ID:</span>
                      <span className="font-mono font-medium">{order.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Items:</span>
                      <span className="font-medium">{order.items.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total:</span>
                      <span className="font-bold text-primary">{formatPrice(order.total)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge className="bg-blue-500/15 text-blue-700">
                        {order.status.replace("_", " ")}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="font-medium text-sm">Order Items:</p>
                  {order.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm py-2 border-b last:border-0">
                      <span className="text-muted-foreground">
                        {item.product_id} × {item.quantity}
                      </span>
                      <span className="font-medium">{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleComplete}
                  disabled={loading}
                >
                  <Package className="h-5 w-5 mr-2" />
                  Complete Pickup
                </Button>
              </motion.div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-xl mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              Product out of stock here?
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Check other stores or recommend online delivery
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Input
                placeholder="Product ID (e.g. P00001)"
                value={productId}
                onChange={(e) => setProductId(e.target.value.toUpperCase())}
                className="font-mono max-w-[180px]"
              />
              <select
                value={currentStoreId}
                onChange={(e) => setCurrentStoreId(e.target.value)}
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                {STORES.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <Button onClick={checkAvailability} disabled={availLoading || !productId.trim()}>
                {availLoading ? "Checking..." : "Check availability"}
              </Button>
            </div>
            {availError && (
              <p className="text-sm text-red-600 dark:text-red-400">{availError}</p>
            )}
            {availability && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border p-4 space-y-3"
              >
                {!availability.found ? (
                  <p className="text-sm text-muted-foreground">Product not found.</p>
                ) : (
                  <>
                    <p className="font-medium">
                      {availability.product_name || availability.product_id}
                    </p>
                    {availability.in_stock ? (
                      <p className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                        <Check className="h-4 w-4" /> In stock at this store
                      </p>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" /> Out of stock at this store
                        </p>
                        {availability.other_stores_with_stock.length > 0 && (
                          <div>
                            <p className="text-sm font-medium mb-1">Available at:</p>
                            <ul className="space-y-1">
                              {availability.other_stores_with_stock.map((s) => (
                                <li key={s.id} className="flex items-center gap-2 text-sm">
                                  <Store className="h-4 w-4 text-primary" />
                                  {s.name}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {availability.deliver_online && (
                          <div className="pt-2 border-t">
                            <p className="text-sm font-medium flex items-center gap-2">
                              <Truck className="h-4 w-4" /> Or get it delivered
                            </p>
                            <Link href="/products" className="text-sm text-primary hover:underline">
                              Order online →
                            </Link>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>Store Staff Only • AuraShop Pickup System</p>
        </div>
      </div>
    </div>
  );
}
