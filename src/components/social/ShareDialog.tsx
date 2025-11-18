import { useState, useRef, useEffect, ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Share2, Copy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  shareText: string;
  children: ReactNode;
}

const componentToImage = async (elementRef: HTMLElement): Promise<Blob> => {
  const canvas = await html2canvas(elementRef, {
    backgroundColor: null,
    scale: 2,
    logging: false,
    useCORS: true
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create image'));
        }
      },
      'image/png',
      1.0
    );
  });
};

const shareImage = async (blob: Blob, title: string, text: string): Promise<void> => {
  const file = new File([blob], `${title}.png`, { type: 'image/png' });

  if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title,
        text,
        files: [file]
      });
      toast.success('Shared successfully!');
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Share failed:', error);
        downloadImage(blob, title);
      }
    }
  } else {
    downloadImage(blob, title);
  }
};

const downloadImage = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  toast.success('Downloaded! Share it on your social media! 📱');
};

const copyImageToClipboard = async (blob: Blob): Promise<void> => {
  try {
    if (navigator.clipboard && navigator.clipboard.write) {
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blob
        })
      ]);
      toast.success('Copied to clipboard! Paste it anywhere! 📋');
    } else {
      throw new Error('Clipboard API not supported');
    }
  } catch (error) {
    console.error('Failed to copy image:', error);
    toast.error('Could not copy image. Try downloading instead.');
  }
};

export const ShareDialog = ({ isOpen, onClose, title, shareText, children }: Props) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Generate image when dialog opens
  useEffect(() => {
    if (isOpen && cardRef.current && !imageBlob) {
      generateImage();
    }
  }, [isOpen]);

  const generateImage = async () => {
    if (!cardRef.current) return;

    setIsGenerating(true);
    try {
      const blob = await componentToImage(cardRef.current);
      setImageBlob(blob);
    } catch (error) {
      console.error('Failed to generate image:', error);
      toast.error('Failed to generate share image');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    if (!imageBlob) return;
    await shareImage(imageBlob, title, shareText);
  };

  const handleDownload = () => {
    if (!imageBlob) return;
    downloadImage(imageBlob, title);
  };

  const handleCopy = async () => {
    if (!imageBlob) return;
    await copyImageToClipboard(imageBlob);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Share Your Achievement! 🎉</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview of the card */}
          <div ref={cardRef} className="flex justify-center">
            {children}
          </div>

          {/* Share actions */}
          <div className="grid grid-cols-3 gap-2">
            <Button
              onClick={handleShare}
              disabled={isGenerating || !imageBlob}
              className="w-full"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </>
              )}
            </Button>

            <Button
              onClick={handleDownload}
              variant="outline"
              disabled={isGenerating || !imageBlob}
              className="w-full"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </>
              )}
            </Button>

            <Button
              onClick={handleCopy}
              variant="outline"
              disabled={isGenerating || !imageBlob}
              className="w-full"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </>
              )}
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Share your achievements and invite friends to join PayFesa! 🚀
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
