import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Stethoscope, Loader2 } from "lucide-react";

interface DoctorPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  description?: string;
}

export function DoctorPasswordDialog({ open, onOpenChange, onSuccess, description }: DoctorPasswordDialogProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleClose = (val: boolean) => {
    if (!val) {
      setPassword("");
      setError("");
    }
    onOpenChange(val);
  };

  const handleVerify = async () => {
    if (!password) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/doctor/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setPassword("");
        setError("");
        onOpenChange(false);
        onSuccess();
      } else {
        setError("Incorrect doctor password.");
      }
    } catch {
      setError("Could not verify password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleVerify();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[360px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" />
            Doctor Access Required
          </DialogTitle>
          <DialogDescription>
            {description ?? "Enter the doctor password to continue."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="doctor-password">Doctor Password</Label>
            <Input
              id="doctor-password"
              type="password"
              placeholder="Enter doctor password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              onKeyDown={handleKeyDown}
              autoFocus
            />
            {error && <p className="text-sm text-destructive font-medium">{error}</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleVerify} disabled={!password || loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Verify
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
