import { toast } from "sonner";

export function exportToCSV(data: any[], filename: string) {
  if (!data || !data.length) {
    toast.error("No data available to export");
    return;
  }

  try {
    // 1. Clean and transform rows into flat objects
    const cleanedRows = data.map((row) => {
      const cleanObj: Record<string, any> = {};
      for (const [key, value] of Object.entries(row)) {
        // Skip internal or sensitive keys
        if (
          key.startsWith("_") ||
          key === "rawId" ||
          key === "password" ||
          key === "resetPasswordToken" ||
          key === "resetPasswordExpiresAt"
        ) {
          continue;
        }

        // Format Header Title (e.g., totalAmount -> Total Amount)
        const formattedKey = key
          .replace(/([A-Z])/g, " $1")
          .replace(/^./, (str) => str.toUpperCase())
          .trim();

        // Format Values
        if (value === null || value === undefined) {
          cleanObj[formattedKey] = "";
        } else if (typeof value === "boolean") {
          cleanObj[formattedKey] = value ? "Yes" : "No";
        } else if (typeof value === "object") {
          if (Array.isArray(value)) {
            cleanObj[formattedKey] = value.map((v) => (typeof v === "object" && v ? (v as any).name || (v as any).title || JSON.stringify(v) : v)).join("; ");
          } else if (value instanceof Date) {
            cleanObj[formattedKey] = value.toLocaleDateString("en-IN");
          } else {
            const obj = value as any;
            cleanObj[formattedKey] = obj.name || obj.fullName || obj.title || obj.email || JSON.stringify(obj);
          }
        } else {
          cleanObj[formattedKey] = String(value);
        }
      }
      return cleanObj;
    });

    if (!cleanedRows.length) {
      toast.error("No exportable fields found");
      return;
    }

    // 2. Extract headers
    const headers = Object.keys(cleanedRows[0]);

    // 3. Create CSV content with UTF-8 BOM (\uFEFF) for Excel compatibility
    const csvLines = [
      headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(","),
      ...cleanedRows.map((row) =>
        headers
          .map((fieldName) => {
            let val = row[fieldName];
            if (val === null || val === undefined) val = "";
            val = String(val).replace(/"/g, '""');
            return `"${val}"`;
          })
          .join(",")
      ),
    ];

    const csvContent = "\uFEFF" + csvLines.join("\r\n");

    // 4. Create blob and trigger download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    const finalFilename = filename.endsWith(".csv") ? filename : `${filename}.csv`;
    link.setAttribute("href", url);
    link.setAttribute("download", finalFilename);
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Successfully exported ${filename}`);
  } catch (err: any) {
    console.error("CSV Export Error:", err);
    toast.error("Failed to generate CSV export");
  }
}
