"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { listenBusiness, listenAllServices, issueToken, type Biz, type Svc } from "@/lib/db";
import { EscPosPrinter, printViaUSB, printViaBluetooth } from "@/lib/printer";

function KioskContent() {
  const searchParams = useSearchParams();
  const bizId = searchParams?.get("biz") || "";

  const [biz, setBiz] = useState<Biz | null>(null);
  const [services, setServices] = useState<Svc[]>([]);
  const [printerMode, setPrinterMode] = useState<"usb" | "bluetooth" | "browser" | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printError, setPrintError] = useState<string | null>(null);
  const [printData, setPrintData] = useState<{serviceName: string; tokenNumber: string; waiting: number; date: string} | null>(null);

  useEffect(() => {
    if (!bizId) return;
    const unsubBiz = listenBusiness(bizId, setBiz);
    const unsubSvc = listenAllServices((all) => {
      setServices(all.filter((s) => s.businessId === bizId));
    });
    return () => {
      unsubBiz();
      unsubSvc();
    };
  }, [bizId]);

  useEffect(() => {
    if (printData && printerMode === "browser") {
      const timer = setTimeout(() => {
        window.print();
        // We delay clearing printData slightly so the browser doesn't close the print dialog with an empty page
        setTimeout(() => setPrintData(null), 500);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [printData, printerMode]);

  async function handlePrintReceipt(serviceName: string, tokenNumber: string, waiting: number) {
    if (!biz) return;
    const now = new Date();
    
    // If fallback browser mode is selected, use standard printing
    if (printerMode === "browser") {
      setPrintData({
        serviceName,
        tokenNumber,
        waiting,
        date: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " " + now.toLocaleDateString()
      });
      return;
    }

    try {
      const printer = new EscPosPrinter();
      
      // Header
      printer.align(1); // Center
      printer.bold(true);
      printer.size(2, 2);
      printer.textLine(biz.name);
      
      printer.size(1, 1);
      printer.bold(false);
      printer.textLine("Welcome!");
      printer.feed(1);
      
      // Service
      printer.size(1, 1);
      printer.textLine(`Service: ${serviceName}`);
      printer.feed(1);
      
      // Token Number (Huge)
      printer.size(3, 3);
      printer.bold(true);
      printer.textLine(tokenNumber);
      
      // Details
      printer.feed(1);
      printer.size(1, 1);
      printer.bold(false);
      printer.textLine(`People ahead: ${waiting}`);
      printer.textLine(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " " + now.toLocaleDateString());
      
      // Footer
      printer.feed(2);
      printer.textLine("Please wait for your number");
      printer.textLine("to be called.");
      printer.feed(4);
      printer.cut();

      const bytes = printer.build();

      if (printerMode === "bluetooth") {
        await printViaBluetooth(bytes);
      } else if (printerMode === "usb") {
        await printViaUSB(bytes);
      }
    } catch (err: any) {
      console.error(err);
      setPrintError(err.message || "Failed to print to hardware.");
    }
  }

  async function handleIssueToken(svc: Svc) {
    if (isPrinting) return;
    setIsPrinting(true);
    setPrintError(null);
    try {
      const token = await issueToken(bizId, svc.id, { name: "Kiosk User", phone: "", priority: "Regular" });
      await handlePrintReceipt(svc.name, token.number, svc.currentServing > 0 ? Math.max(0, token.numericValue - svc.currentServing - 1) : 0);
    } catch (err: any) {
      setPrintError(err.message || "Failed to generate token");
    } finally {
      setTimeout(() => setIsPrinting(false), 2000); // Prevent spam clicking
    }
  }

  if (!bizId) {
    return <div className="h-screen grid place-items-center bg-gray-100 text-xl font-bold">Please provide a ?biz=ID parameter in the URL</div>;
  }

  if (printerMode === null) {
    return (
      <div className="h-screen bg-[#f5f8fd] grid place-items-center px-4">
        <div className="bg-white rounded-3xl shadow-xl p-10 max-w-lg w-full text-center">
          <div className="text-5xl mb-6">🖨️</div>
          <h1 className="text-3xl font-black text-ink mb-4">Setup Printer</h1>
          <p className="text-ink-3 mb-8">How is your thermal printer connected to this device?</p>
          
          <div className="flex flex-col gap-4">
            <button 
              onClick={() => setPrinterMode("usb")}
              className="px-6 py-4 rounded-2xl font-bold text-white shadow-lg transition-transform hover:-translate-y-1" style={{ background: "linear-gradient(135deg, #315cff, #284ee0)" }}>
              🔌 USB Cable
            </button>
            <button 
              onClick={() => setPrinterMode("bluetooth")}
              className="px-6 py-4 rounded-2xl font-bold text-white shadow-lg transition-transform hover:-translate-y-1" style={{ background: "linear-gradient(135deg, #06D6A0, #00A676)" }}>
              📶 Bluetooth
            </button>
            <button 
              onClick={() => setPrinterMode("browser")}
              className="px-6 py-4 rounded-2xl font-bold border-2 border-border text-ink hover:bg-gray-50 transition-colors mt-2">
              🌐 Standard Browser Print
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-surface flex flex-col relative overflow-hidden text-ink print:bg-white print:h-auto print:overflow-visible">
      {/* Background Decor */}
      <div className="absolute inset-0 pointer-events-none opacity-20 print:hidden" style={{ background: "radial-gradient(circle at top left, #315cff, transparent 50%)" }} />
      <div className="absolute inset-0 pointer-events-none opacity-20 print:hidden" style={{ background: "radial-gradient(circle at bottom right, #59d4d1, transparent 50%)" }} />

      {/* Print-only Receipt (hidden on screen, visible on printer) */}
      <div className="hidden print:block text-black p-4 bg-white" style={{ width: '80mm', margin: '0 auto', fontFamily: 'monospace' }}>
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold">{biz?.name}</h1>
          <div className="text-sm mt-1">Welcome!</div>
        </div>
        
        <div className="text-sm mb-4">
          <div>Service:</div>
          <div className="font-bold text-lg">{printData?.serviceName}</div>
        </div>
        
        <div className="text-center mb-6 border-y-2 border-black border-dashed py-4">
          <div className="text-5xl font-bold mb-2">{printData?.tokenNumber}</div>
        </div>
        
        <div className="text-sm mb-6 text-center">
          <div>People ahead: {printData?.waiting}</div>
          <div>{printData?.date}</div>
        </div>
        
        <div className="text-center text-sm">
          Please wait for your number<br/>to be called.
        </div>
      </div>

      {/* Header */}
      <header className="p-10 flex flex-col items-center justify-center relative z-10 print:hidden">
        {biz?.customLogoUrl ? (
          <img src={biz.customLogoUrl} alt={biz.name} className="h-16 max-w-[300px] object-contain mb-4" />
        ) : (
          <h1 className="text-5xl font-black tracking-tight mb-2">{biz?.name || "Welcome"}</h1>
        )}
        <p className="text-2xl text-ink-3 font-medium">Please tap a service to get your token</p>
      </header>

      {/* Services Grid */}
      <main className="flex-1 p-10 overflow-y-auto relative z-10 flex flex-col items-center justify-center gap-6 print:hidden">
        {printError && (
          <div className="bg-red-100 border-2 border-red-500 text-red-700 px-6 py-4 rounded-xl font-bold mb-4 animate-bounce">
            ⚠️ {printError}
            <button onClick={() => setPrinterMode(null)} className="ml-4 underline">Change Printer Setup</button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
          {services.map((svc) => (
            <button
              key={svc.id}
              onClick={() => handleIssueToken(svc)}
              disabled={isPrinting}
              className={`bg-white rounded-3xl p-8 flex items-center gap-6 shadow-[0_10px_30px_rgba(0,0,0,0.05)] border-2 border-transparent transition-all ${isPrinting ? 'opacity-50 scale-95' : 'hover:scale-105 hover:border-[#315cff] hover:shadow-[0_20px_40px_rgba(49,92,255,0.15)] active:scale-95'}`}
            >
              <div className="w-20 h-20 bg-gray-50 rounded-2xl border flex items-center justify-center text-4xl shadow-inner shrink-0">
                {svc.icon}
              </div>
              <div className="text-left">
                <h2 className="text-3xl font-bold mb-1">{svc.name}</h2>
                <p className="text-lg text-ink-3">Tap to print ticket</p>
              </div>
            </button>
          ))}
        </div>
      </main>

      {/* Overlay during printing */}
      {isPrinting && !printError && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-in fade-in print:hidden">
          <div className="w-24 h-24 bg-[#315cff] rounded-3xl flex items-center justify-center text-white text-5xl mb-6 shadow-2xl animate-pulse">
            🖨️
          </div>
          <h2 className="text-4xl font-black text-ink mb-2">Printing your token...</h2>
          <p className="text-2xl text-ink-3">Please take your receipt below</p>
        </div>
      )}

      {/* Change Printer Settings (Hidden corner) */}
      <button 
        onClick={() => setPrinterMode(null)}
        className="absolute bottom-4 right-4 w-12 h-12 rounded-full opacity-10 hover:opacity-100 transition-opacity flex items-center justify-center text-xl bg-black text-white z-50 print:hidden">
        ⚙️
      </button>
    </div>
  );
}

export default function KioskPage() {
  return (
    <Suspense fallback={<div className="h-screen bg-gray-100 flex items-center justify-center">Loading Kiosk...</div>}>
      <KioskContent />
    </Suspense>
  );
}
