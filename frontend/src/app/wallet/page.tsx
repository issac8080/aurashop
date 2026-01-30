"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Wallet as WalletIcon, TrendingUp, TrendingDown, Clock, Gift, ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/app/providers";
import { formatPrice } from "@/lib/utils";

const API = "/api";

type Transaction = {
  id: string;
  amount: number;
  type: string;
  source: string;
  description: string;
  order_id?: string;
  expires_at?: string;
  created_at: string;
  is_expired: boolean;
};

type WalletData = {
  balance: number;
  total_earned: number;
  total_spent: number;
};

type Summary = {
  balance: number;
  total_earned: number;
  total_spent: number;
  active_cashback: number;
  expiring_soon: number;
  transaction_count: number;
};

export default function WalletPage() {
  const { sessionId } = useCart();
  const userId = sessionId;
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadWallet() {
      try {
        const res = await fetch(`${API}/users/${userId}/wallet`);
        if (res.ok) {
          const data = await res.json();
          setWallet(data.wallet);
          setSummary(data.summary);
        }
      } catch {}
    }
    async function loadTransactions() {
      try {
        const res = await fetch(`${API}/users/${userId}/wallet/transactions?limit=20`);
        if (res.ok) {
          const data = await res.json();
          setTransactions(data.transactions || []);
        }
      } catch {}
      finally {
        setLoading(false);
      }
    }
    if (userId) {
      loadWallet();
      loadTransactions();
    }
  }, [userId]);

  const getTransactionIcon = (type: string, source: string) => {
    if (type === "credit") {
      if (source === "aurapoints" || source === "cashback") return <Gift className="h-4 w-4 text-emerald-600" />;
      return <TrendingUp className="h-4 w-4 text-emerald-600" />;
    }
    return <TrendingDown className="h-4 w-4 text-red-600" />;
  };

  const getTransactionColor = (type: string) => {
    return type === "credit" ? "text-emerald-600" : "text-red-600";
  };

  if (loading) {
    return (
      <div className="py-12 text-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
        <p className="mt-4 text-muted-foreground">Loading wallet...</p>
      </div>
    );
  }

  return (
    <div className="py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/profile">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Aura Wallet
          </h1>
          <p className="text-muted-foreground">Earn AuraPoints on every purchase</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:col-span-2"
        >
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-purple-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <WalletIcon className="h-5 w-5 text-primary" />
                Wallet Balance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="text-4xl font-bold text-primary">
                  {formatPrice(summary?.balance || 0)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Available to use on your next purchase
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                      Total Earned
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-emerald-600">
                    {formatPrice(summary?.total_earned || 0)}
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingDown className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
                      Total Spent
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatPrice(summary?.total_spent || 0)}
                  </p>
                </div>
              </div>

              {summary && summary.expiring_soon > 0 && (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <Clock className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-700 dark:text-amber-400">
                      {formatPrice(summary.expiring_soon)} expiring soon
                    </p>
                    <p className="text-sm text-amber-600/80 dark:text-amber-400/80">
                      Use within 7 days to avoid expiry
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Cashback Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-primary" />
                AuraPoints Rewards
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Earn on every order:</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                    <span className="text-sm">Orders under ₹1,000</span>
                    <Badge className="bg-emerald-500/15 text-emerald-700">5%</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                    <span className="text-sm">Orders ₹1,000+</span>
                    <Badge className="bg-emerald-500/15 text-emerald-700">7%</Badge>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-xs text-muted-foreground mb-1">Validity</p>
                <p className="text-sm font-medium">30 days from credit</p>
              </div>

              <div className="text-xs text-muted-foreground">
                <p>• AuraPoints credited after order delivery</p>
                <p>• Use on any future purchase</p>
                <p>• No minimum order value</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Transactions */}
        <div className="md:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-8">
                  <WalletIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">No transactions yet</p>
                  <Link href="/products">
                    <Button className="mt-4" size="sm">
                      Start Shopping
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {transactions.map((txn) => (
                    <motion.div
                      key={txn.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`flex items-center justify-between p-4 rounded-lg border ${
                        txn.is_expired ? "opacity-50 bg-muted/30" : "bg-muted/50"
                      }`}
                    >
                      <div className="flex items-start gap-3 flex-1">
                        {getTransactionIcon(txn.type, txn.source)}
                        <div className="flex-1">
                          <p className="font-medium text-sm">{txn.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-muted-foreground">
                              {new Date(txn.created_at).toLocaleDateString()}
                            </p>
                            {txn.expires_at && !txn.is_expired && (
                              <Badge variant="outline" className="text-xs">
                                <Clock className="h-3 w-3 mr-1" />
                                Expires {new Date(txn.expires_at).toLocaleDateString()}
                              </Badge>
                            )}
                            {txn.is_expired && (
                              <Badge variant="outline" className="text-xs text-muted-foreground">
                                Expired
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <p className={`font-bold ${getTransactionColor(txn.type)}`}>
                        {txn.type === "credit" ? "+" : "-"}
                        {formatPrice(txn.amount)}
                      </p>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
