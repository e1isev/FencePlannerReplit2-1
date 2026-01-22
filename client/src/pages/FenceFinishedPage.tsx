import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { QuoteDocument } from "@/components/QuoteDocument";
import { CanvasStage } from "@/components/CanvasStage";
import { useFenceQuoteViewModel } from "@/hooks/useFenceQuoteViewModel";
import "@/styles/quotePrint.css";

export default function FenceFinishedPage() {
  const [, setLocation] = useLocation();
  const baseViewModel = useFenceQuoteViewModel();
  const [isCopied, setIsCopied] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");

  const viewModel = useMemo(() => ({
    ...baseViewModel,
    quoteMeta: {
      ...baseViewModel.quoteMeta,
      customerName: customerName || baseViewModel.quoteMeta.customerName,
      customerEmail: customerEmail || baseViewModel.quoteMeta.customerEmail,
      customerPhone: customerPhone,
    },
    delivery: {
      ...baseViewModel.delivery,
      deliveryAddress: deliveryAddress || baseViewModel.delivery.deliveryAddress,
      deliveryNotes: deliveryNotes,
    },
  }), [baseViewModel, customerName, customerEmail, customerPhone, deliveryAddress, deliveryNotes]);

  const handleCopyLink = async () => {
    if (!navigator?.clipboard) return;
    await navigator.clipboard.writeText(window.location.href);
    setIsCopied(true);
    window.setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white">
      <div className="no-print sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="text-xs uppercase tracking-wide text-slate-500">Get an Estimate</div>
            <div className="text-lg font-semibold text-slate-900">Fence estimate</div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={() => setLocation("/planner")} data-testid="button-back-planner">Back to planner</Button>
            <Button variant="outline" onClick={handleCopyLink} disabled={isCopied} data-testid="button-copy-link">
              {isCopied ? "Link copied" : "Copy link"}
            </Button>
            <Button onClick={() => window.print()} data-testid="button-print">Print</Button>
          </div>
        </div>
      </div>

      <main className="quote-page max-w-6xl mx-auto px-4 md:px-6 py-8 space-y-8">
        <section className="no-print rounded-2xl border border-slate-200 bg-white shadow-sm p-6 space-y-6">
          <h2 className="text-lg font-semibold text-slate-900">Customer Details</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="customerName">Customer Name</Label>
              <Input
                id="customerName"
                placeholder="Enter customer name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                data-testid="input-customer-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerEmail">Email Address</Label>
              <Input
                id="customerEmail"
                type="email"
                placeholder="customer@example.com"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                data-testid="input-customer-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerPhone">Phone Number</Label>
              <Input
                id="customerPhone"
                type="tel"
                placeholder="04XX XXX XXX"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                data-testid="input-customer-phone"
              />
            </div>
          </div>
        </section>

        <section className="no-print rounded-2xl border border-slate-200 bg-white shadow-sm p-6 space-y-6">
          <h2 className="text-lg font-semibold text-slate-900">Delivery Address</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="deliveryAddress">Delivery Address</Label>
              <Textarea
                id="deliveryAddress"
                placeholder="Enter full delivery address"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className="min-h-[80px]"
                data-testid="input-delivery-address"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deliveryNotes">Delivery Notes (optional)</Label>
              <Textarea
                id="deliveryNotes"
                placeholder="Any special delivery instructions"
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                className="min-h-[80px]"
                data-testid="input-delivery-notes"
              />
            </div>
          </div>
        </section>

        <QuoteDocument
          viewModel={viewModel}
          headerAddon={
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200">
                <p className="text-sm font-semibold text-slate-900">Fence layout</p>
                <p className="text-xs text-slate-500">Satellite map underlay with fence footprint.</p>
              </div>
              <div className="h-72 md:h-96 flex">
                <CanvasStage readOnly initialMapMode="satellite" />
              </div>
            </section>
          }
        />
      </main>
    </div>
  );
}
