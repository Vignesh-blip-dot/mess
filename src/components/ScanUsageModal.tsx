import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  UploadCloud,
  Camera,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Plus,
  RefreshCw,
  Key,
  ArrowRight,
  FilePlus,
  Layers,
  Utensils,
  AlertTriangle,
} from 'lucide-react';
import { Ingredient, MealType } from '../types';
import {
  getGeminiApiKey,
  setGeminiApiKey,
} from '../lib/geminiBillScanner';
import {
  scanMealUsageSheet,
  scanMultipleMealUsagePages,
  ExtractedUsageItem,
  ExtractedUsageData,
} from '../lib/geminiUsageScanner';

interface ScanUsageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (data: {
    usageDate?: string;
    mealType?: MealType | '';
    items: {
      ingredientId: string;
      quantity: string;
      unit: string;
    }[];
  }) => void;
  provisions: Ingredient[];
}

export function ScanUsageModal({
  isOpen,
  onClose,
  onApply,
  provisions,
}: ScanUsageModalProps) {
  const [step, setStep] = useState<'upload' | 'scanning' | 'review'>('upload');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [apiKey, setApiKey] = useState<string>(() => getGeminiApiKey());
  const [showApiKeyInput, setShowApiKeyInput] = useState<boolean>(false);
  const [tempApiKey, setTempApiKey] = useState<string>(() => getGeminiApiKey());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scanStatusMessage, setScanStatusMessage] = useState('Initializing AI...');
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Review & multi-page state
  const [usageDate, setUsageDate] = useState('');
  const [mealType, setMealType] = useState<MealType | ''>('');
  const [items, setItems] = useState<ExtractedUsageItem[]>([]);
  const [scannedPagesCount, setScannedPagesCount] = useState<number>(1);
  const [isContinued, setIsContinued] = useState<boolean>(false);
  const [pageFilter, setPageFilter] = useState<'all' | number>('all');
  const [appendSuccessMessage, setAppendSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const addMoreFileInputRef = useRef<HTMLInputElement>(null);
  const nextPageFileInputRef = useRef<HTMLInputElement>(null);
  const nextPageCameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCooldownSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  useEffect(() => {
    if (isOpen) {
      const existingKey = getGeminiApiKey();
      setApiKey(existingKey);
      setTempApiKey(existingKey);
      setShowApiKeyInput(!existingKey);
    }
  }, [isOpen]);

  // Clean up object URLs
  useEffect(() => {
    return () => {
      previewUrls.forEach((u) => {
        if (u) URL.revokeObjectURL(u);
      });
    };
  }, [previewUrls]);

  if (!isOpen) return null;

  const handleFilesSelect = (files: FileList | File[], append: boolean = false) => {
    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (f.type.startsWith('image/') || f.type === 'application/pdf') {
        validFiles.push(f);
      }
    }

    if (validFiles.length === 0) {
      setErrorMessage('Please select image files (JPG, PNG, WebP) or PDF usage sheets.');
      return;
    }

    setErrorMessage(null);
    const newFiles = append ? [...selectedFiles, ...validFiles] : validFiles;
    setSelectedFiles(newFiles);

    previewUrls.forEach((u) => {
      if (u) URL.revokeObjectURL(u);
    });
    const urls = newFiles.map((f) => (f.type.startsWith('image/') ? URL.createObjectURL(f) : ''));
    setPreviewUrls(urls);
  };

  const handleRemoveFile = (index: number) => {
    const updated = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(updated);
    if (previewUrls[index]) URL.revokeObjectURL(previewUrls[index]);
    setPreviewUrls(previewUrls.filter((_, i) => i !== index));
  };

  const handleSaveApiKey = () => {
    const trimmed = tempApiKey.trim();
    if (!trimmed) {
      setErrorMessage('Please enter a valid Gemini API key.');
      return;
    }
    setGeminiApiKey(trimmed);
    setApiKey(trimmed);
    setShowApiKeyInput(false);
    setErrorMessage(null);
  };

  const handleStartScan = async () => {
    if (selectedFiles.length === 0) {
      setErrorMessage('Please upload or capture a usage sheet image first.');
      return;
    }
    const activeKey = (apiKey.trim() || tempApiKey.trim() || getGeminiApiKey()).trim();
    if (!activeKey) {
      setShowApiKeyInput(true);
      setErrorMessage('A Gemini API key is required to analyze the usage sheet.');
      return;
    }

    setErrorMessage(null);
    setAppendSuccessMessage(null);
    setStep('scanning');

    try {
      let result: ExtractedUsageData;
      if (selectedFiles.length === 1) {
        setScanStatusMessage('Optimizing usage sheet photo for Page 1...');
        result = await scanMealUsageSheet(
          selectedFiles[0],
          provisions,
          activeKey,
          (msg) => setScanStatusMessage(msg),
          1
        );
        setScannedPagesCount(1);
      } else {
        setScanStatusMessage(`Starting multi-page scan for ${selectedFiles.length} pages...`);
        result = await scanMultipleMealUsagePages(
          selectedFiles,
          provisions,
          activeKey,
          (msg) => setScanStatusMessage(msg)
        );
        setScannedPagesCount(selectedFiles.length);
      }

      setUsageDate(result.usage_date || '');
      setMealType(result.meal_type || '');
      setIsContinued(Boolean(result.is_continued));
      setItems(result.items);
      setPageFilter('all');
      setStep('review');
    } catch (err: any) {
      console.error('Scan usage error:', err);
      if (err.message?.includes('limit reached') || err.message?.includes('rate limit')) {
        setCooldownSeconds(15);
      }
      setErrorMessage(err.message || 'Failed to scan usage sheet. Please check the image and your API key.');
      setStep('upload');
    }
  };

  const handleScanNextPage = async (file: File) => {
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      setErrorMessage('Please select an image file (JPG, PNG, WebP) or PDF for the next page.');
      return;
    }

    const activeKey = (apiKey.trim() || tempApiKey.trim() || getGeminiApiKey()).trim();
    if (!activeKey) {
      setShowApiKeyInput(true);
      setErrorMessage('A Gemini API key is required to analyze the usage sheet.');
      return;
    }

    const targetPageNum = scannedPagesCount + 1;
    setErrorMessage(null);
    setAppendSuccessMessage(null);
    setStep('scanning');
    setScanStatusMessage(`Scanning Page ${targetPageNum}: Optimizing photo...`);

    try {
      const result: ExtractedUsageData = await scanMealUsageSheet(
        file,
        provisions,
        activeKey,
        (msg) => setScanStatusMessage(`Page ${targetPageNum}: ${msg}`),
        targetPageNum
      );

      // Append new items
      setItems((prev) => [...prev, ...result.items]);
      setScannedPagesCount(targetPageNum);
      setIsContinued(Boolean(result.is_continued));

      if (!usageDate && result.usage_date) {
        setUsageDate(result.usage_date);
      }
      if (!mealType && result.meal_type) {
        setMealType(result.meal_type);
      }

      setAppendSuccessMessage(
        `Page ${targetPageNum} scanned successfully! Appended ${result.items.length} additional items.`
      );
      setPageFilter('all');
      setStep('review');
    } catch (err: any) {
      console.error('Scan next page error:', err);
      if (err.message?.includes('limit reached') || err.message?.includes('rate limit')) {
        setCooldownSeconds(15);
      }
      setErrorMessage(err.message || `Failed to scan Page ${targetPageNum}.`);
      setStep('review');
    }
  };

  const handleItemChange = (id: string, field: keyof ExtractedUsageItem, value: any) => {
    setItems((prev) => {
      const index = prev.findIndex((it) => it.id === id);
      if (index === -1) return prev;
      const next = [...prev];
      const item = { ...next[index], [field]: value };

      if (field === 'matched_ingredient_id') {
        const ing = provisions.find((p) => p.ingredient_id === value);
        if (ing) {
          item.matched_ingredient_name = ing.name;
          item.is_matched = true;
          item.confidence = 1.0;
          const availableUnits = [ing.unit, ...(ing.conversions?.map((c) => c.unit_name) || [])];
          if (!availableUnits.includes(item.unit)) {
            item.unit = ing.conversions?.[0]?.unit_name || ing.unit;
          }
        }
      }

      if (field === 'quantity') {
        item.quantity = parseFloat(value) || 0;
      }

      next[index] = item;
      return next;
    });
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleAddBlankItem = () => {
    const firstIng = provisions[0];
    setItems((prev) => [
      ...prev,
      {
        id: `ext-usage-manual-${Date.now()}`,
        raw_name: 'Manual Item',
        matched_ingredient_id: firstIng ? firstIng.ingredient_id : '',
        matched_ingredient_name: firstIng ? firstIng.name : '',
        quantity: 1,
        unit: firstIng ? (firstIng.conversions?.[0]?.unit_name || firstIng.unit) : 'kg',
        confidence: 1.0,
        is_matched: Boolean(firstIng),
        page: scannedPagesCount,
      },
    ]);
  };

  const handleApplyToForm = () => {
    const validItems = items
      .filter((it) => it.matched_ingredient_id && it.quantity > 0)
      .map((it) => ({
        ingredientId: it.matched_ingredient_id,
        quantity: String(it.quantity),
        unit: it.unit,
      }));

    if (validItems.length === 0) {
      setErrorMessage('Please ensure at least one valid ingredient with quantity is selected.');
      return;
    }

    onApply({
      usageDate: usageDate || undefined,
      mealType: mealType || '',
      items: validItems,
    });
    onClose();
  };

  const displayedItems = pageFilter === 'all'
    ? items
    : items.filter((it) => (it.page || 1) === pageFilter);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-xs overscroll-contain">
      <div className="bg-white border border-[#e5e0d5] rounded-sm w-full max-w-full sm:max-w-3xl md:max-w-4xl h-[98vh] sm:h-auto max-h-[96vh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-3.5 sm:p-5 border-b border-[#e5e0d5] bg-white shrink-0">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="p-1.5 sm:p-2 rounded-sm bg-[#193d2c] text-[#f7f9f7] shrink-0">
              <Utensils size={16} className="text-[#a3e635]" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h3 className="font-serif text-base sm:text-xl font-bold text-[#131715] truncate">
                  Scan Meal Usage Sheet
                </h3>
                <span className="text-[9px] sm:text-[10px] font-mono-fig px-1.5 py-0.5 rounded bg-[#e6f0ea] text-[#193d2c] font-semibold border border-[#193d2c]/20">
                  Kitchen Consumption OCR
                </span>
                {scannedPagesCount > 1 && (
                  <span className="text-[9px] sm:text-[10px] font-mono-fig px-1.5 py-0.5 rounded bg-[#f4f7f5] text-[#193d2c] font-bold border border-[#e5e0d5]">
                    {scannedPagesCount} Pages
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-[#59635e] truncate hidden sm:block">
                Extract date, meal type, ingredients, and quantities consumed from kitchen chits or register photos.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#59635e] hover:text-[#131715] p-1.5 rounded hover:bg-[#f4f7f5] transition-colors cursor-pointer shrink-0 touch-manipulation"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-[#faeaea] border border-[#942426]/30 rounded-sm text-xs text-[#942426] flex items-start gap-2">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <div className="flex-1">{errorMessage}</div>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-[#942426] font-bold text-xs"
              >
                &times;
              </button>
            </div>
          )}

          {/* API Key Configuration Drawer */}
          <div className="bg-[#fafbf9] border border-[#e5e0d5] rounded-sm p-3 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-semibold text-[#131715]">
                <Key size={13} className="text-[#193d2c]" />
                <span>Gemini API Key</span>
                {apiKey ? (
                  <span className="text-[10px] font-mono-fig text-[#193d2c] bg-[#e6f0ea] px-1.5 py-0.2 rounded border border-[#193d2c]/20">
                    Configured
                  </span>
                ) : (
                  <span className="text-[10px] font-mono-fig text-[#942426] bg-[#faeaea] px-1.5 py-0.2 rounded border border-[#942426]/20">
                    Missing
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowApiKeyInput(!showApiKeyInput)}
                className="text-[11px] text-[#193d2c] hover:underline cursor-pointer font-medium"
              >
                {showApiKeyInput ? 'Hide' : apiKey ? 'Change Key' : 'Enter Key'}
              </button>
            </div>

            {showApiKeyInput && (
              <div className="space-y-2 pt-1 border-t border-[#e5e0d5]">
                <p className="text-[11px] text-[#59635e]">
                  Gemini Flash Vision requires a free API key from Google AI Studio. The key is saved locally in your browser.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="password"
                    placeholder="Paste your Gemini API key (AIzaSy...)"
                    value={tempApiKey}
                    onChange={(e) => setTempApiKey(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-[#e5e0d5] rounded-sm text-[#131715] font-mono-fig focus:outline-none focus:ring-1 focus:ring-[#193d2c]"
                  />
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleSaveApiKey}
                      className="px-3 py-1.5 bg-[#193d2c] text-[#f7f9f7] rounded-sm font-semibold hover:bg-[#112a1f] transition-colors cursor-pointer text-xs"
                    >
                      Save Key
                    </button>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 bg-white border border-[#e5e0d5] text-[#193d2c] hover:bg-[#f4f7f5] rounded-sm transition-colors text-xs flex items-center gap-1"
                    >
                      <span>Get Free Key</span>
                      <ArrowRight size={10} />
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* STAGE 1: UPLOAD / CAPTURE */}
          {step === 'upload' && (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => e.target.files && handleFilesSelect(e.target.files)}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFilesSelect([e.target.files[0]])}
              />
              <input
                ref={addMoreFileInputRef}
                type="file"
                multiple
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => e.target.files && handleFilesSelect(e.target.files, true)}
              />

              {selectedFiles.length === 0 ? (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files) handleFilesSelect(e.dataTransfer.files);
                  }}
                  className="border-2 border-dashed border-[#e5e0d5] hover:border-[#193d2c]/50 rounded-sm p-8 sm:p-10 text-center space-y-3 bg-[#fafbf9] transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="mx-auto w-12 h-12 rounded-full bg-[#e6f0ea] text-[#193d2c] flex items-center justify-center">
                    <UploadCloud size={24} />
                  </div>
                  <div>
                    <span className="font-semibold text-sm text-[#131715] block">
                      Click to upload or drag &amp; drop meal usage sheet
                    </span>
                    <span className="text-xs text-[#59635e]">
                      Upload photos of kitchen chits, blackboards, or daily consumption register pages (JPG, PNG, WebP, PDF)
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        cameraInputRef.current?.click();
                      }}
                      className="px-3 py-1.5 bg-white border border-[#193d2c]/40 text-[#193d2c] hover:bg-[#e6f0ea] rounded-sm text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    >
                      <Camera size={13} />
                      <span>Take Photo with Camera</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-[#fafbf9] border border-[#e5e0d5] rounded-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers size={16} className="text-[#193d2c]" />
                      <span className="font-bold text-xs text-[#131715]">
                        Selected Usage Sheets ({selectedFiles.length})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFiles([]);
                        setPreviewUrls([]);
                      }}
                      className="text-[#942426] hover:underline text-xs cursor-pointer font-medium"
                    >
                      Clear All
                    </button>
                  </div>

                  {/* List of selected pages */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                    {selectedFiles.map((f, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-white border border-[#e5e0d5] rounded-sm flex items-center justify-between text-xs hover:border-[#193d2c]/40 transition-colors"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-mono-fig text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#e6f0ea] text-[#193d2c] shrink-0 border border-[#193d2c]/20">
                            Page {idx + 1}
                          </span>
                          <span className="truncate text-[#131715] font-medium max-w-[130px] sm:max-w-[150px]">
                            {f.name}
                          </span>
                          <span className="text-[10px] text-[#59635e] font-mono-fig shrink-0">
                            ({(f.size / 1024).toFixed(0)} KB)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(idx)}
                          className="p-1 text-[#942426] hover:bg-[#faeaea] rounded transition-colors cursor-pointer shrink-0 ml-1"
                          title="Remove this sheet"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add Another Page Button */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#e5e0d5]">
                    <button
                      type="button"
                      onClick={() => addMoreFileInputRef.current?.click()}
                      className="px-2.5 py-1.5 bg-white border border-[#e5e0d5] text-[#193d2c] hover:bg-[#f4f7f5] text-xs font-semibold rounded-sm cursor-pointer flex items-center gap-1 touch-manipulation"
                    >
                      <Plus size={12} />
                      <span>Add Page {selectedFiles.length + 1}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleStartScan}
                      disabled={cooldownSeconds > 0}
                      className="px-4 py-2 sm:py-1.5 bg-[#193d2c] text-[#f7f9f7] rounded-sm text-xs font-semibold hover:bg-[#112a1f] transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50 touch-manipulation"
                    >
                      <Sparkles size={13} className="text-[#a3e635]" />
                      <span>
                        {cooldownSeconds > 0
                          ? `Cooldown (${cooldownSeconds}s)`
                          : selectedFiles.length > 1
                          ? `Scan All ${selectedFiles.length} Sheets`
                          : 'Extract Usages'}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STAGE 2: SCANNING / PROCESSING */}
          {step === 'scanning' && (
            <div className="py-12 px-4 text-center space-y-4">
              <div className="mx-auto w-14 h-14 rounded-full bg-[#e6f0ea] text-[#193d2c] flex items-center justify-center animate-pulse">
                <RefreshCw size={24} className="animate-spin text-[#193d2c]" />
              </div>
              <div className="space-y-1">
                <h4 className="font-serif text-base font-bold text-[#131715]">
                  Analyzing Kitchen Usage Sheet with Gemini Vision
                </h4>
                <p className="text-xs text-[#59635e] font-mono-fig">{scanStatusMessage}</p>
              </div>
              <div className="max-w-xs mx-auto bg-[#f4f7f5] border border-[#e5e0d5] rounded-full h-1.5 overflow-hidden">
                <div className="bg-[#193d2c] h-full w-2/3 animate-[shimmer_1.5s_infinite]"></div>
              </div>
            </div>
          )}

          {/* STAGE 3: REVIEW EXTRACTED USAGES */}
          {step === 'review' && (
            <div className="space-y-4">
              {/* Hidden Inputs for scanning next page from review step */}
              <input
                ref={nextPageFileInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleScanNextPage(e.target.files[0]);
                    e.target.value = '';
                  }
                }}
              />
              <input
                ref={nextPageCameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleScanNextPage(e.target.files[0]);
                    e.target.value = '';
                  }
                }}
              />

              {/* Continuation Alert Banner if page 1 indicated continuation */}
              {isContinued && (
                <div className="p-2.5 bg-[#fef8e7] border border-[#f0d080] rounded-sm text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={14} className="text-[#9e743a] shrink-0" />
                    <span className="text-[#6d501a] text-[11px]">
                      <strong>Sheet Continued:</strong> This page indicates that the usage log continues to another page.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => nextPageFileInputRef.current?.click()}
                    className="px-2.5 py-1 text-[11px] font-bold bg-[#193d2c] text-white rounded-sm hover:bg-[#112a1f] transition-colors cursor-pointer shrink-0 ml-2"
                  >
                    Scan Page {scannedPagesCount + 1} &rarr;
                  </button>
                </div>
              )}

              {/* Append Success Notification */}
              {appendSuccessMessage && (
                <div className="p-2.5 bg-[#e6f0ea] border border-[#193d2c]/20 rounded-sm text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-[#193d2c] shrink-0" />
                    <span className="text-[#193d2c] text-[11px] font-medium">
                      {appendSuccessMessage}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAppendSuccessMessage(null)}
                    className="text-[#193d2c] hover:text-[#112a1f] font-bold text-xs cursor-pointer"
                  >
                    &times;
                  </button>
                </div>
              )}

              {/* Date & Meal Type Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-[#fafbf9] border border-[#e5e0d5] rounded-sm text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-[#59635e] uppercase tracking-wider mb-1 font-mono-fig">
                    Detected Date of Usage
                  </label>
                  <input
                    type="date"
                    value={usageDate}
                    onChange={(e) => setUsageDate(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs bg-white border border-[#e5e0d5] rounded-sm text-[#131715] focus:outline-none focus:ring-1 focus:ring-[#193d2c]"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-bold text-[#59635e] uppercase tracking-wider font-mono-fig">
                      Detected Meal Type
                    </label>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-mono-fig px-1.5 py-0.2 rounded bg-[#f4f7f5] text-[#59635e] border border-[#e5e0d5]">
                        Optional
                      </span>
                      {mealType && (
                        <button
                          type="button"
                          onClick={() => setMealType('')}
                          className="text-[10px] text-[#942426] hover:underline cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                  <select
                    value={mealType}
                    onChange={(e) => setMealType(e.target.value as MealType | '')}
                    className="w-full px-2 py-1.5 text-xs bg-white border border-[#e5e0d5] rounded-sm text-[#131715] focus:outline-none focus:ring-1 focus:ring-[#193d2c]"
                  >
                    <option value="">No Meal Specified (General / Whole Day)</option>
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="dinner">Dinner</option>
                  </select>
                </div>
              </div>

              {/* Items Section Header */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#131715] uppercase tracking-wider font-mono-fig">
                      Extracted Usage Items ({items.length})
                    </span>

                    {/* Page filter pills if multi-page */}
                    {scannedPagesCount > 1 && (
                      <div className="flex items-center gap-1 bg-[#f4f7f5] p-0.5 rounded border border-[#e5e0d5] text-[10px]">
                        <button
                          type="button"
                          onClick={() => setPageFilter('all')}
                          className={`px-2 py-0.5 rounded cursor-pointer font-medium transition-colors ${
                            pageFilter === 'all'
                              ? 'bg-[#193d2c] text-white shadow-2xs'
                              : 'text-[#59635e] hover:text-[#131715]'
                          }`}
                        >
                          All ({items.length})
                        </button>
                        {Array.from({ length: scannedPagesCount }, (_, i) => i + 1).map((pg) => {
                          const pgCount = items.filter((it) => (it.page || 1) === pg).length;
                          return (
                            <button
                              key={pg}
                              type="button"
                              onClick={() => setPageFilter(pg)}
                              className={`px-2 py-0.5 rounded cursor-pointer font-medium transition-colors ${
                                pageFilter === pg
                                  ? 'bg-[#193d2c] text-white shadow-2xs'
                                  : 'text-[#59635e] hover:text-[#131715]'
                              }`}
                            >
                              Page {pg} ({pgCount})
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {/* + Scan Page Button with file & camera trigger */}
                    <div className="flex items-center shadow-2xs rounded-sm">
                      <button
                        type="button"
                        onClick={() => nextPageFileInputRef.current?.click()}
                        className="px-2.5 py-1.5 text-xs font-semibold bg-[#e6f0ea] text-[#193d2c] border border-[#193d2c]/30 rounded-l-sm hover:bg-[#d5e7dc] flex items-center gap-1.5 transition-colors cursor-pointer touch-manipulation"
                        title={`Scan Page ${scannedPagesCount + 1} of this usage sheet`}
                      >
                        <FilePlus size={13} />
                        <span>+ Page {scannedPagesCount + 1}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => nextPageCameraInputRef.current?.click()}
                        className="px-2.5 py-1.5 text-xs bg-[#e6f0ea] text-[#193d2c] border border-l-0 border-[#193d2c]/30 rounded-r-sm hover:bg-[#d5e7dc] flex items-center gap-1 transition-colors cursor-pointer touch-manipulation"
                        title="Take photo of next page with camera"
                      >
                        <Camera size={13} />
                        <span className="hidden sm:inline text-[11px] font-medium">Camera</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddBlankItem}
                      className="px-2.5 py-1.5 text-xs text-[#193d2c] bg-white border border-[#e5e0d5] hover:bg-[#f4f7f5] rounded-sm flex items-center gap-1 font-semibold cursor-pointer touch-manipulation shadow-2xs"
                    >
                      <Plus size={12} />
                      <span>Add Item</span>
                    </button>
                  </div>
                </div>

                {displayedItems.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-[#e5e0d5] rounded-sm text-xs text-[#59635e]">
                    No usage items found. You can add items manually or scan the next page.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[48vh] sm:max-h-[44vh] overflow-y-auto custom-scrollbar pr-1">
                    {/* Desktop Column Header */}
                    <div className="hidden sm:grid grid-cols-12 gap-2.5 px-3 py-1 text-[10px] font-bold text-[#59635e] uppercase tracking-wider font-mono-fig">
                      <div className="col-span-6">Provisional Ingredient</div>
                      <div className="col-span-3 text-right">Quantity Used</div>
                      <div className="col-span-3">Packaging Unit</div>
                    </div>

                    {displayedItems.map((item) => {
                      const selectedIng = provisions.find(
                        (p) => p.ingredient_id === item.matched_ingredient_id
                      );
                      const availableUnits = selectedIng
                        ? [selectedIng.unit, ...(selectedIng.conversions?.map((c) => c.unit_name) || [])]
                        : ['kg', 'litre', 'piece'];

                      const conv = selectedIng?.conversions?.find((c) => c.unit_name === item.unit);
                      const mult = conv ? conv.multiplier : 1;
                      const calculatedBase = item.quantity * mult;
                      const isOverStock = selectedIng && calculatedBase > selectedIng.current_stock;

                      return (
                        <div
                          key={item.id}
                          className={`p-3 bg-white border rounded-sm space-y-2 text-xs transition-colors shadow-2xs ${
                            isOverStock
                              ? 'border-[#942426]/40 bg-[#fff9f9]'
                              : 'border-[#e5e0d5] hover:border-[#193d2c]/40'
                          }`}
                        >
                          {/* Row Top: Detected chit text + Stock Info + Match badge + Remove button */}
                          <div className="flex items-center justify-between text-[11px] text-[#59635e] pb-1.5 border-b border-[#f4f7f5]">
                            <div className="flex items-center gap-2 truncate">
                              <span className="font-semibold text-[#131715]">Chit:</span>
                              <span className="font-mono-fig italic truncate">"{item.raw_name}"</span>
                              {scannedPagesCount > 1 && (
                                <span className="font-mono-fig text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#f4f7f5] text-[#193d2c] border border-[#193d2c]/20 shrink-0">
                                  Page {item.page || 1}
                                </span>
                              )}
                              {selectedIng && (
                                <span className="text-[10px] font-mono-fig text-[#59635e] shrink-0">
                                  (Avail: {selectedIng.current_stock} {selectedIng.unit})
                                </span>
                              )}
                              {isOverStock && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#942426] bg-[#faeaea] px-1.5 py-0.5 rounded shrink-0">
                                  <AlertTriangle size={10} />
                                  <span>Exceeds Stock!</span>
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {item.is_matched ? (
                                <span className="inline-flex items-center gap-1 text-[10px] text-[#193d2c] bg-[#e6f0ea] px-1.5 py-0.5 rounded font-mono-fig">
                                  <CheckCircle2 size={10} />
                                  <span>Matched</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] text-[#9e743a] bg-[#faf3e8] px-1.5 py-0.5 rounded font-mono-fig">
                                  <span>Check Item</span>
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(item.id)}
                                className="p-1.5 text-[#942426] hover:bg-[#faeaea] rounded transition-colors cursor-pointer touch-manipulation"
                                title="Remove item"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>

                          {/* Row Inputs: 2 cols on smartphone, 12 cols on tablet/desktop */}
                          <div className="grid grid-cols-2 sm:grid-cols-12 gap-2 sm:gap-2.5 items-end">
                            {/* Ingredient Dropdown */}
                            <div className="col-span-2 sm:col-span-6">
                              <label className="block sm:hidden text-[10px] font-bold text-[#59635e] uppercase tracking-wider mb-1 font-mono-fig">
                                Provision
                              </label>
                              <select
                                value={item.matched_ingredient_id}
                                onChange={(e) =>
                                  handleItemChange(item.id, 'matched_ingredient_id', e.target.value)
                                }
                                className="w-full px-2.5 py-2 sm:py-1.5 text-xs bg-white border border-[#e5e0d5] rounded-sm text-[#131715] font-medium focus:outline-none focus:ring-1 focus:ring-[#193d2c]"
                              >
                                <option value="">-- Select Provision --</option>
                                {provisions.map((ing) => (
                                  <option key={ing.ingredient_id} value={ing.ingredient_id}>
                                    {ing.name} {ing.name_telugu ? `(${ing.name_telugu})` : ''} (Stock: {ing.current_stock} {ing.unit})
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Quantity */}
                            <div className="col-span-1 sm:col-span-3">
                              <label className="block sm:hidden text-[10px] font-bold text-[#59635e] uppercase tracking-wider mb-1 font-mono-fig">
                                Quantity Used
                              </label>
                              <input
                                type="number"
                                step="any"
                                min="0.01"
                                placeholder="Qty"
                                value={item.quantity || ''}
                                onChange={(e) =>
                                  handleItemChange(
                                    item.id,
                                    'quantity',
                                    e.target.value
                                  )
                                }
                                className="w-full px-2.5 py-2 sm:py-1.5 text-xs bg-white border border-[#e5e0d5] rounded-sm text-[#131715] font-mono-fig text-right focus:outline-none focus:ring-1 focus:ring-[#193d2c]"
                              />
                            </div>

                            {/* Packaging Unit Selector */}
                            <div className="col-span-1 sm:col-span-3">
                              <label className="block sm:hidden text-[10px] font-bold text-[#59635e] uppercase tracking-wider mb-1 font-mono-fig">
                                Unit
                              </label>
                              <select
                                value={item.unit}
                                onChange={(e) => handleItemChange(item.id, 'unit', e.target.value)}
                                className="w-full px-2 py-2 sm:py-1.5 text-xs bg-[#f4f7f5] border border-[#e5e0d5] rounded-sm text-[#193d2c] font-semibold focus:outline-none focus:ring-1 focus:ring-[#193d2c]"
                              >
                                {availableUnits.map((u) => (
                                  <option key={u} value={u}>
                                    {u}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Base conversion hint if using secondary packaging unit */}
                          {conv && mult !== 1 && (
                            <div className="text-[11px] text-[#59635e] font-mono-fig pl-1">
                              = {calculatedBase} {selectedIng?.unit} base inventory will be deducted ({item.quantity} &times; {mult}{selectedIng?.unit})
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-5 border-t border-[#e5e0d5] bg-white flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="w-full sm:w-auto">
            {step === 'review' && (
              <button
                type="button"
                onClick={() => setStep('upload')}
                className="w-full sm:w-auto text-xs text-[#59635e] hover:text-[#131715] cursor-pointer flex items-center justify-center sm:justify-start gap-1 font-medium py-1 touch-manipulation"
              >
                &larr; Rescan Usage Sheet
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-3.5 py-2.5 sm:py-2 text-xs border border-[#e5e0d5] rounded-sm text-[#59635e] hover:text-[#131715] bg-white transition-colors cursor-pointer text-center touch-manipulation"
            >
              Cancel
            </button>

            {step === 'upload' && (
              <button
                type="button"
                onClick={handleStartScan}
                disabled={selectedFiles.length === 0 || cooldownSeconds > 0}
                className="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 text-xs font-semibold rounded-sm bg-[#193d2c] text-[#f7f9f7] hover:bg-[#112a1f] transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer shadow-xs touch-manipulation"
              >
                <Sparkles size={13} className="text-[#a3e635]" />
                <span>
                  {cooldownSeconds > 0
                    ? `Cooldown (${cooldownSeconds}s)`
                    : selectedFiles.length > 1
                    ? `Scan ${selectedFiles.length} Sheets`
                    : 'Extract Usages'}
                </span>
              </button>
            )}

            {step === 'review' && (
              <button
                type="button"
                onClick={handleApplyToForm}
                disabled={items.length === 0}
                className="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 text-xs font-semibold rounded-sm bg-[#193d2c] text-[#f7f9f7] hover:bg-[#112a1f] transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer shadow-xs touch-manipulation"
              >
                <CheckCircle2 size={14} className="text-[#a3e635]" />
                <span>Apply to Usage Form ({items.length})</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
