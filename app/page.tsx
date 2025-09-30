"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

//Enrich Specific Components
import { CSVUploader } from "./fire-enrich/csv-uploader";
import { UnifiedEnrichmentView } from "./fire-enrich/unified-enrichment-view";
import { EnrichmentTable } from "./fire-enrich/enrichment-table";
import { CSVRow, EnrichmentField } from "@/lib/types";

// Import shared components
import HeroFlame from "@/components/shared/effects/flame/hero-flame";
import { HeaderProvider } from "@/components/shared/header/HeaderContext";

// Import hero section components
import HomeHeroBackground from "@/components/app/(home)/sections/hero/Background/Background";
import { BackgroundOuterPiece } from "@/components/app/(home)/sections/hero/Background/BackgroundOuterPiece";
import HomeHeroBadge from "@/components/app/(home)/sections/hero/Badge/Badge";
import HomeHeroPixi from "@/components/app/(home)/sections/hero/Pixi/Pixi";
import HomeHeroTitle from "@/components/app/(home)/sections/hero/Title/Title";
import HeroScraping from "@/components/app/(home)/sections/hero-scraping/HeroScraping";

// Import header components
import HeaderBrandKit from "@/components/shared/header/BrandKit/BrandKit";
import HeaderWrapper from "@/components/shared/header/Wrapper/Wrapper";
import HeaderDropdownWrapper from "@/components/shared/header/Dropdown/Wrapper/Wrapper";
import GithubIcon from "@/components/shared/header/Github/_svg/GithubIcon";
import ButtonUI from "@/components/shared/button/button";

// Ui Imports
import { toast } from "sonner";
import { ArrowLeft, ExternalLink, Loader2 } from "lucide-react";
import Button from "@/components/shared/button/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Input from "@/components/ui/input";

export default function HomePage() {
  //enrich-states
  const [step, setStep] = useState<"upload" | "setup" | "enrichment">("upload");
  const [csvData, setCsvData] = useState<{
    rows: CSVRow[];
    columns: string[];
  } | null>(null);
  const [emailColumn, setEmailColumn] = useState<string>("");
  const [selectedFields, setSelectedFields] = useState<EnrichmentField[]>([]);
  const [isCheckingEnv, setIsCheckingEnv] = useState(true);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [firecrawlApiKey, setFirecrawlApiKey] = useState<string>("");
  const [openaiApiKey, setOpenaiApiKey] = useState<string>("");
  const [isValidatingApiKey, setIsValidatingApiKey] = useState(false);
  const [missingKeys, setMissingKeys] = useState<{
    firecrawl: boolean;
    openai: boolean;
  }>({ firecrawl: false, openai: false });
  const [pendingCSVData, setPendingCSVData] = useState<{
    rows: CSVRow[];
    columns: string[];
  } | null>(null);

  //enrich effect function
  useEffect(() => {
    const checkEnvironment = async () => {
      try {
        const response = await fetch("/api/check-env");
        if (!response.ok) {
          throw new Error("Failed to check environment");
        }
        const data = await response.json();
        const hasFirecrawl = data.environmentStatus.FIRECRAWL_API_KEY;
        const hasOpenAI = data.environmentStatus.OPENAI_API_KEY;

        if (!hasFirecrawl) {
          // Check localStorage for saved API key
          const savedKey = localStorage.getItem("firecrawl_api_key");
          if (savedKey) {
            setFirecrawlApiKey(savedKey);
          }
        }

        if (!hasOpenAI) {
          // Check localStorage for saved API key
          const savedKey = localStorage.getItem("openai_api_key");
          if (savedKey) {
            setOpenaiApiKey(savedKey);
          }
        }
      } catch (error) {
        console.error("Error checking environment:", error);
      } finally {
        setIsCheckingEnv(false);
      }
    };

    checkEnvironment();
  }, []);

  const handleCSVUpload = async (rows: CSVRow[], columns: string[]) => {
    // Check if we have Firecrawl API key
    const response = await fetch("/api/check-env");
    const data = await response.json();
    const hasFirecrawl = data.environmentStatus.FIRECRAWL_API_KEY;
    const hasOpenAI = data.environmentStatus.OPENAI_API_KEY;
    const savedFirecrawlKey = localStorage.getItem("firecrawl_api_key");
    const savedOpenAIKey = localStorage.getItem("openai_api_key");

    if (
      (!hasFirecrawl && !savedFirecrawlKey) ||
      (!hasOpenAI && !savedOpenAIKey)
    ) {
      // Save the CSV data temporarily and show API key modal
      setPendingCSVData({ rows, columns });
      setMissingKeys({
        firecrawl: !hasFirecrawl && !savedFirecrawlKey,
        openai: !hasOpenAI && !savedOpenAIKey,
      });
      setShowApiKeyModal(true);
    } else {
      setCsvData({ rows, columns });
      setStep("setup");
    }
  };

  const handleStartEnrichment = (email: string, fields: EnrichmentField[]) => {
    setEmailColumn(email);
    setSelectedFields(fields);
    setStep("enrichment");
  };

  const handleBack = () => {
    if (step === "setup") {
      setStep("upload");
    } else if (step === "enrichment") {
      setStep("setup");
    }
  };

  const resetProcess = () => {
    setStep("upload");
    setCsvData(null);
    setEmailColumn("");
    setSelectedFields([]);
  };

  const openFirecrawlWebsite = () => {
    window.open("https://www.firecrawl.dev", "_blank");
  };

  const handleApiKeySubmit = async () => {
    // Check environment again to see what's missing
    const response = await fetch("/api/check-env");
    const data = await response.json();
    const hasEnvFirecrawl = data.environmentStatus.FIRECRAWL_API_KEY;
    const hasEnvOpenAI = data.environmentStatus.OPENAI_API_KEY;
    const hasSavedFirecrawl = localStorage.getItem("firecrawl_api_key");
    const hasSavedOpenAI = localStorage.getItem("openai_api_key");

    const needsFirecrawl = !hasEnvFirecrawl && !hasSavedFirecrawl;
    const needsOpenAI = !hasEnvOpenAI && !hasSavedOpenAI;

    if (needsFirecrawl && !firecrawlApiKey.trim()) {
      toast.error("Please enter a valid Firecrawl API key");
      return;
    }

    if (needsOpenAI && !openaiApiKey.trim()) {
      toast.error("Please enter a valid OpenAI API key");
      return;
    }

    setIsValidatingApiKey(true);

    try {
      // Test the Firecrawl API key if provided
      if (firecrawlApiKey) {
        const response = await fetch("/api/scrape", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Firecrawl-API-Key": firecrawlApiKey,
          },
          body: JSON.stringify({ url: "https://example.com" }),
        });

        if (!response.ok) {
          throw new Error("Invalid Firecrawl API key");
        }

        // Save the API key to localStorage
        localStorage.setItem("firecrawl_api_key", firecrawlApiKey);
      }

      // Save OpenAI API key if provided
      if (openaiApiKey) {
        localStorage.setItem("openai_api_key", openaiApiKey);
      }

      toast.success("API keys saved successfully!");
      setShowApiKeyModal(false);

      // Process the pending CSV data
      if (pendingCSVData) {
        setCsvData(pendingCSVData);
        setStep("setup");
        setPendingCSVData(null);
      }
    } catch (error) {
      toast.error("Invalid API key. Please check and try again.");
      console.error("API key validation error:", error);
    } finally {
      setIsValidatingApiKey(false);
    }
  };

  return (
    <HeaderProvider>
      <div className="min-h-screen bg-background-base">
        {/* Header/Navigation Section */}
        <HeaderDropdownWrapper />
        <div className="sticky top-0 left-0 w-full z-[40] bg-background-base header">
          <HeaderWrapper>
            <div className="max-w-[900px] mx-auto w-full flex justify-between items-center">
              <div className="flex gap-24 items-center">
                <HeaderBrandKit />
              </div>
              <div className="flex gap-8">
                <a
                  className="contents"
                  href="https://github.com/firecrawl/fire-enrich"
                  target="_blank"
                >
                  <ButtonUI variant="tertiary">
                    <GithubIcon />
                    Use this Template
                  </ButtonUI>
                </a>
              </div>
            </div>
          </HeaderWrapper>
        </div>

        {/* Hero Section */}
        <section className="overflow-x-clip" id="home-hero">
          <div
            className={`pt-28 lg:pt-254 lg:-mt-100 ${step === "upload" ? "pb-115" : "pb-20"} relative `}
            id="hero-content"
          >
            <HomeHeroPixi />
            <HeroFlame />

            <HomeHeroBackground />

            <AnimatePresence mode="wait">
              {step == "upload" ? (
                <motion.div
                  key="hero"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.5 }}
                  className="relative container px-16"
                >
                  <HomeHeroBadge />
                  <HomeHeroTitle />

                  <p className="text-center text-body-large">
                    Enrich you leads with clean & accurate data
                    <br className="lg-max:hidden" />
                    crawled from all over the internet.
                  </p>
                  <Link
                    className="bg-black-alpha-4 hover:bg-black-alpha-6 rounded-6 px-8 lg:px-6 text-label-large h-30 lg:h-24 block mt-8 mx-auto w-max gap-4 transition-all"
                    href="https://firecrawl.dev"
                  >
                    Powered by Firecrawl
                  </Link>
                </motion.div>
              ) : (
                <motion.div
                  key="enrichment-process"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="relative container px-8 lg:px-16"
                >
                  <div className="text-center mb-8 lg:mb-12">
                    <HomeHeroBadge />
                    <div className="mb-6">
                      <h1 className="text-4xl lg:text-5xl font-bold text-[#36322F] mb-4">
                        {step === "setup"
                          ? "Configure Enrichment"
                          : "Enrichment Results"}
                      </h1>
                      <p className="text-center text-body-large text-gray-600">
                        {step === "setup"
                          ? "Select the fields you want to enrich and configure your settings"
                          : "Your enriched data is ready. Click on any row to view detailed information"}
                      </p>
                    </div>
                  </div>

                  <div className="w-full max-w-7xl mx-auto relative z-[11] lg:z-[2]">
                    <div
                      className="bg-accent-white rounded-lg p-6 lg:p-10"
                      style={{
                        boxShadow:
                          "0px 0px 44px 0px rgba(0, 0, 0, 0.02), 0px 88px 56px -20px rgba(0, 0, 0, 0.03), 0px 56px 56px -20px rgba(0, 0, 0, 0.02), 0px 32px 32px -20px rgba(0, 0, 0, 0.03), 0px 16px 24px -12px rgba(0, 0, 0, 0.03), 0px 0px 0px 1px rgba(0, 0, 0, 0.05), 0px 0px 0px 10px #F9F9F9",
                      }}
                    >
                      <Button
                        variant="secondary"
                        size="default"
                        onClick={handleBack}
                        className="mb-6 flex items-center gap-1.5"
                      >
                        <ArrowLeft size={16} />
                        Back
                      </Button>

                      {step === "setup" && csvData && (
                        <div className="w-full">
                          <UnifiedEnrichmentView
                            rows={csvData.rows}
                            columns={csvData.columns}
                            onStartEnrichment={handleStartEnrichment}
                          />
                        </div>
                      )}

                      {step === "enrichment" && csvData && (
                        <div className="w-full">
                          <EnrichmentTable
                            rows={csvData.rows}
                            fields={selectedFields}
                            emailColumn={emailColumn}
                          />
                          <div className="mt-16 text-center">
                            <Button
                              variant="primary"
                              size="default"
                              onClick={resetProcess}
                            >
                              Start New Enrichment
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {step == "upload" && (
            <motion.div
              className="container lg:contents !p-16 relative -mt-90"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="max-w-400 lg:min-w-700 mx-auto w-full relative z-[11] lg:z-[2] rounded-20 -mt-30 lg:-mt-98">
                <div
                  className="overlay bg-accent-white"
                  style={{
                    boxShadow:
                      "0px 0px 44px 0px rgba(0, 0, 0, 0.02), 0px 88px 56px -20px rgba(0, 0, 0, 0.03), 0px 56px 56px -20px rgba(0, 0, 0, 0.02), 0px 32px 32px -20px rgba(0, 0, 0, 0.03), 0px 16px 24px -12px rgba(0, 0, 0, 0.03), 0px 0px 0px 1px rgba(0, 0, 0, 0.05), 0px 0px 0px 10px #F9F9F9",
                  }}
                />

                <div className="p-16 flex flex-col justify-center relative lg:min-w-[700px]">
                  {isCheckingEnv ? (
                    <div className="text-center py-10">
                      <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                      <p className="text-sm text-muted-foreground">
                        Initializing...
                      </p>
                    </div>
                  ) : (
                    <div className="w-full">
                      <CSVUploader onUpload={handleCSVUpload} />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
          {step === "upload" && (
            <div className="flex items-center justify-center">
              <div className="hidden md:block">
                <BackgroundOuterPiece />
              </div>
              <HeroScraping />
            </div>
          )}
        </section>
      </div>
      {/*Dialog Input for BYOK*/}
      <Dialog open={showApiKeyModal} onOpenChange={setShowApiKeyModal}>
        <DialogContent
          className="sm:max-w-md"
          style={{ backgroundColor: "var(--accent-white)" }}
        >
          <DialogHeader>
            <DialogTitle>API Keys Required</DialogTitle>
            <DialogDescription>
              This tool requires API keys for Firecrawl and OpenAI to enrich
              your CSV data.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            {missingKeys.firecrawl && (
              <>
                <Button
                  onClick={openFirecrawlWebsite}
                  variant="secondary"
                  size="default"
                  className="flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ExternalLink className="h-4 w-4" />
                  Get Firecrawl API Key
                </Button>
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="firecrawl-key"
                    className="text-sm font-medium"
                  >
                    Firecrawl API Key
                  </label>
                  <Input
                    id="firecrawl-key"
                    type="password"
                    placeholder="fc-..."
                    value={firecrawlApiKey}
                    onChange={(e) => setFirecrawlApiKey(e.target.value)}
                    disabled={isValidatingApiKey}
                  />
                </div>
              </>
            )}

            {missingKeys.openai && (
              <>
                <Button
                  onClick={() =>
                    window.open(
                      "https://platform.openai.com/api-keys",
                      "_blank",
                    )
                  }
                  variant="secondary"
                  size="default"
                  className="flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ExternalLink className="h-4 w-4" />
                  Get OpenAI API Key
                </Button>
                <div className="flex flex-col gap-2">
                  <label htmlFor="openai-key" className="text-sm font-medium">
                    OpenAI API Key
                  </label>
                  <Input
                    id="openai-key"
                    type="password"
                    placeholder="sk-..."
                    value={openaiApiKey}
                    onChange={(e) => setOpenaiApiKey(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !isValidatingApiKey) {
                        handleApiKeySubmit();
                      }
                    }}
                    disabled={isValidatingApiKey}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setShowApiKeyModal(false)}
              disabled={isValidatingApiKey}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApiKeySubmit}
              disabled={isValidatingApiKey || !firecrawlApiKey.trim()}
              variant="primary"
            >
              {isValidatingApiKey ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Validating...
                </>
              ) : (
                "Submit"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </HeaderProvider>
  );
}
