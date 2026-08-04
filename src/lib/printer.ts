/**
 * Waitless ESC/POS Direct Thermal Printer Utility
 * This generates raw byte commands to send directly to USB/Bluetooth thermal printers.
 */

export class EscPosPrinter {
  private buffer: number[] = [];

  constructor() {
    this.init();
  }

  // Initialize printer
  init() {
    this.buffer.push(0x1b, 0x40); // ESC @
  }

  // Align text (0: Left, 1: Center, 2: Right)
  align(align: 0 | 1 | 2) {
    this.buffer.push(0x1b, 0x61, align); // ESC a n
  }

  // Set font size (1-8 for width and height)
  size(width: number, height: number) {
    const n = ((width - 1) << 4) | (height - 1);
    this.buffer.push(0x1d, 0x21, n); // GS ! n
  }

  // Toggle bold text
  bold(on: boolean) {
    this.buffer.push(0x1b, 0x45, on ? 1 : 0); // ESC E n
  }

  // Print text
  text(str: string) {
    for (let i = 0; i < str.length; i++) {
      this.buffer.push(str.charCodeAt(i));
    }
  }

  // Print text and add a new line
  textLine(str: string) {
    this.text(str);
    this.buffer.push(0x0a); // LF
  }

  // Feed n lines
  feed(n: number = 1) {
    this.buffer.push(0x1b, 0x64, n); // ESC d n
  }

  // Cut paper (Partial cut if supported, otherwise full)
  cut() {
    this.buffer.push(0x1d, 0x56, 0x41, 0x00); // GS V A 0
  }

  // Build the final Uint8Array
  build(): Uint8Array {
    return new Uint8Array(this.buffer);
  }
}

/**
 * Connect to a WebUSB Printer and print the receipt
 */
export async function printViaUSB(bytes: Uint8Array): Promise<boolean> {
  const nav = navigator as any;
  if (!nav.usb) {
    throw new Error("WebUSB is not supported in this browser. Please use Chrome or Edge on Android/PC.");
  }
  
  try {
    // Request permission to connect to a USB device
    // We leave filters empty so the user can select their specific printer model
    const device = await nav.usb.requestDevice({ filters: [] });
    await device.open();
    
    // Select the first configuration and interface
    await device.selectConfiguration(1);
    await device.claimInterface(0);

    // Find the USB OUT endpoint to send data to
    let outEndpointNumber = -1;
    const iface = device.configuration!.interfaces[0];
    const alternate = iface.alternates[0];
    for (const endpoint of alternate.endpoints) {
      if (endpoint.direction === "out") {
        outEndpointNumber = endpoint.endpointNumber;
        break;
      }
    }

    if (outEndpointNumber === -1) {
      throw new Error("Could not find printer OUT endpoint");
    }

    // Send the raw ESC/POS bytes
    await device.transferOut(outEndpointNumber, bytes);
    await device.close();
    return true;
  } catch (err) {
    console.error("USB Print Error:", err);
    throw err;
  }
}

/**
 * Connect to a Web Bluetooth Printer and print the receipt
 */
export async function printViaBluetooth(bytes: Uint8Array): Promise<boolean> {
  const nav = navigator as any;
  if (!nav.bluetooth) {
    throw new Error("Web Bluetooth is not supported in this browser. Please use Chrome or Edge on Android/PC.");
  }
  
  try {
    const device = await nav.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb'] // Generic BLE printer service UUID
    });

    const server = await device.gatt?.connect();
    if (!server) throw new Error("Could not connect to Bluetooth GATT server.");

    // Most cheap BLE thermal printers use this generic service and characteristic
    const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb').catch(() => null);
    if (!service) {
      throw new Error("Printer connected, but standard printing service not found.");
    }
    
    const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb').catch(() => null);
    if (!characteristic) {
      throw new Error("Printer connected, but standard writing characteristic not found.");
    }

    // Send data in 512-byte chunks (BLE limit workaround)
    const chunkSize = 512;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.slice(i, i + chunkSize);
      await characteristic.writeValue(chunk);
    }
    
    device.gatt?.disconnect();
    return true;
  } catch (err) {
    console.error("Bluetooth Print Error:", err);
    throw err;
  }
}
