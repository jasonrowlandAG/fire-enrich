"use client";

import { useState, useEffect } from "react";
import Button from "@/components/shared/button/button";
import Input from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { CSVRow, EnrichmentField } from "@/lib/types";
import { detectEmailColumn, EMAIL_REGEX } from "@/lib/utils/email-detection";
import { generateVariableName } from "@/lib/utils/field-utils";
import { X, Plus, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";

interface UnifiedEnrichmentViewProps {
  rows: CSVRow[];
  columns: string[];
  onStartEnrichment: (emailColumn: string, fields: EnrichmentField[]) => void;
}

const PRESET_FIELDS: EnrichmentField[] = [
  {
    name: "companyName",
    displayName: "Company Name",
    description: "The name of the company",
    type: "string",
    required: false,
  },
  {
    name: "companyDescription",
    displayName: "Company Description",
    description: "A brief description of what the company does",
    type: "string",
    required: false,
  },
  {
    name: "industry",
    displayName: "Industry",
    description: "The primary industry the company operates in",
    type: "string",
    required: false,
  },
  {
    name: "employeeCount",
    displayName: "Employee Count",
    description: "The number of employees at the company",
    type: "number",
    required: false,
  },
  {
    name: "yearFounded",
    displayName: "Year Founded",
    description: "The year the company was founded",
    type: "number",
    required: false,
  },
  {
    name: "headquarters",
    displayName: "Headquarters",
    description: "The location of the company headquarters",
    type: "string",
    required: false,
  },
  {
    name: "revenue",
    displayName: "Revenue",
    description: "The annual revenue of the company",
    type: "string",
    required: false,
  },
  {
    name: "fundingRaised",
    displayName: "Funding Raised",
    description: "Total funding raised by the company",
    type: "string",
    required: false,
  },
  {
    name: "fundingStage",
    displayName: "Funding Stage",
    description:
      "The current funding stage (e.g., Pre-seed, Seed, Series A, Series B, Series C, Series D+, IPO)",
    type: "string",
    required: false,
  },
];

export function UnifiedEnrichmentView({
  rows,
  columns,
  onStartEnrichment,
}: UnifiedEnrichmentViewProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [emailColumn, setEmailColumn] = useState<string>("");
  const [selectedFields, setSelectedFields] = useState<EnrichmentField[]>([
    // Default selected fields (3 fields)
    PRESET_FIELDS.find((f) => f.name === "companyName")!,
    PRESET_FIELDS.find((f) => f.name === "companyDescription")!,
    PRESET_FIELDS.find((f) => f.name === "industry")!,
  ]);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [showNaturalLanguage, setShowNaturalLanguage] = useState(false);
  const [naturalLanguageInput, setNaturalLanguageInput] = useState("");
  const [suggestedFields, setSuggestedFields] = useState<EnrichmentField[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAllRows, setShowAllRows] = useState(false);
  const [showEmailDropdown, setShowEmailDropdown] = useState(false);
  const [showEmailDropdownStep1, setShowEmailDropdownStep1] = useState(false);
  const [customField, setCustomField] = useState<{
    name: string;
    description: string;
    type: "string" | "number" | "boolean" | "array";
  }>({
    name: "",
    description: "",
    type: "string",
  });

  // Auto-detect email column but stay on step 1 for confirmation
  useEffect(() => {
    if (rows && columns && Array.isArray(rows) && Array.isArray(columns)) {
      const detection = detectEmailColumn(rows, columns);
      if (detection.columnName && detection.confidence > 50) {
        setEmailColumn(detection.columnName);
        // Stay on step 1 to let user confirm or change
      }
    }
  }, [rows, columns]);

  // Safety check for undefined props
  if (!rows || !columns || !Array.isArray(rows) || !Array.isArray(columns)) {
    return (
      <div className="center text-body-medium text-black-alpha-64">
        <p>No data available. Please upload a CSV file.</p>
      </div>
    );
  }

  const handleAddField = (field: EnrichmentField) => {
    if (selectedFields.length >= 10) {
      toast.error("Maximum 10 fields allowed");
      return;
    }
    if (!selectedFields.find((f) => f.name === field.name)) {
      setSelectedFields([...selectedFields, field]);
    }
  };

  const handleRemoveField = (fieldName: string) => {
    setSelectedFields(selectedFields.filter((f) => f.name !== fieldName));
  };

  const handleGenerateFields = async () => {
    if (!naturalLanguageInput.trim()) return;

    setIsGenerating(true);
    try {
      const response = await fetch("/api/generate-fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: naturalLanguageInput }),
      });

      if (!response.ok) throw new Error("Failed to generate fields");

      const result = await response.json();

      // Convert API response format to frontend format
      if (result.success && result.data && result.data.fields) {
        const convertedFields = result.data.fields.map(
          (field: {
            displayName: string;
            description: string;
            type: string;
          }) => ({
            name: generateVariableName(
              field.displayName,
              selectedFields.map((f) => f.name),
            ),
            displayName: field.displayName,
            description: field.description,
            type:
              field.type === "text"
                ? "string"
                : field.type === "array"
                  ? "string"
                  : (field.type as "string" | "number" | "boolean" | "array"),
            required: false,
          }),
        );
        setSuggestedFields(convertedFields);
      } else {
        throw new Error("Invalid response format");
      }

      setShowNaturalLanguage(false);
      setNaturalLanguageInput("");
    } catch (error) {
      console.error("Error generating fields:", error);
      toast.error("Failed to generate fields. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddCustomField = () => {
    if (!customField.name || !customField.description) {
      toast.error("Please fill in all fields");
      return;
    }

    const fieldName = generateVariableName(
      customField.name,
      selectedFields.map((f) => f.name),
    );
    const newField: EnrichmentField = {
      name: fieldName,
      displayName: customField.name,
      description: customField.description,
      type: customField.type,
      required: false,
    };

    handleAddField(newField);
    setCustomField({ name: "", description: "", type: "string" });
    setShowManualAdd(false);
  };

  const displayRows = showAllRows ? rows : rows.slice(0, 3);
  const maxVisibleFields = 5;
  const startFieldIndex = Math.max(0, selectedFields.length - maxVisibleFields);
  const visibleFields = selectedFields.slice(startFieldIndex);

  return (
    <div className="stack space-y-8">
      {/* Table Preview at the top */}
      <div className="w-full">
        <div className="overflow-x-auto rounded-md border border-border-muted bg-white shadow-sm min-w-0">
          <Table>
            <TableHeader>
              <TableRow className="border-b-2">
                {/* All columns - highlight email column */}
                {columns.map((col, idx) => {
                  const isEmailCol = col === emailColumn;
                  return (
                    <TableHead
                      key={idx}
                      className={cn(
                        "transition-all duration-700 relative",
                        isEmailCol
                          ? "gradient-fire text-white font-medium text-label-small heat-glow"
                          : "bg-background-lighter font-medium text-label-small",
                        !isEmailCol && step >= 2 && "",
                      )}
                    >
                      <span className="text-black-alpha-88">{col}</span>
                    </TableHead>
                  );
                })}
                {/* Preview columns for selected fields */}
                {step >= 2 &&
                  visibleFields.map((field, idx) => (
                    <TableHead
                      key={`new-${idx}`}
                      className={cn(
                        "font-medium transition-all duration-700 bg-heat-12 text-accent-black text-label-small",
                        "animate-in fade-in slide-in-from-right-2",
                      )}
                      style={{
                        animationDelay: `${idx * 100}ms`,
                        animationFillMode: "backwards",
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="text-heat-100 h-12 w-12" />
                        <span className="text-black-alpha-88">
                          {field.displayName}
                        </span>
                      </div>
                    </TableHead>
                  ))}
                {step >= 2 && selectedFields.length > maxVisibleFields && (
                  <TableHead className="text-center text-black-alpha-56 animate-in fade-in duration-700 text-label-small">
                    +{selectedFields.length - maxVisibleFields} more
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayRows.map((row, rowIdx) => (
                <TableRow key={rowIdx} className="group">
                  {/* All columns data - highlight email column */}
                  {columns.map((col, colIdx) => {
                    const isEmailCol = col === emailColumn;
                    const cellValue = row[col] || "";

                    if (isEmailCol) {
                      const email = cellValue.trim();
                      const isValidEmail = email && EMAIL_REGEX.test(email);
                      return (
                        <TableCell
                          key={colIdx}
                          className={cn(
                            "bg-heat-8 transition-all duration-700",
                            "text-accent-black",
                          )}
                        >
                          <span
                            className={cn(
                              "text-mono-small truncate block max-w-[200px] font-mono font-medium",
                              isValidEmail
                                ? "text-accent-black email-valid"
                                : email
                                  ? "text-accent-crimson email-invalid"
                                  : "text-black-alpha-40 email-empty",
                            )}
                          >
                            {email || "-"}
                          </span>
                        </TableCell>
                      );
                    }

                    return (
                      <TableCell
                        key={colIdx}
                        className={cn(
                          "transition-all duration-700 bg-background-base",
                          step >= 2 && "",
                        )}
                      >
                        <span className="text-body-small truncate block min-w-[100px] text-black-alpha-64">
                          {cellValue || "-"}
                        </span>
                      </TableCell>
                    );
                  })}
                  {/* Preview cells for selected fields */}
                  {step >= 2 &&
                    visibleFields.map((field, idx) => (
                      <TableCell
                        key={`new-${idx}`}
                        className={cn(
                          "transition-all duration-700",
                          "animate-in fade-in slide-in-from-right-2",
                        )}
                        style={{
                          animationDelay: `${idx * 100 + rowIdx * 50}ms`,
                          animationFillMode: "backwards",
                        }}
                      >
                        <div className="h-5 rounded-full loading-cell" />
                      </TableCell>
                    ))}
                  {step >= 2 && selectedFields.length > maxVisibleFields && (
                    <TableCell className="text-center text-black-alpha-40 animate-in fade-in duration-700">
                      ...
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {!showAllRows && rows.length > 3 && (
          <button
            onClick={() => setShowAllRows(true)}
            className="text-body-small text-heat-100 hover:text-accent-crimson mt-3 font-medium transition-colors"
          >
            Show {rows.length - 3} more rows →
          </button>
        )}
        {showAllRows && (
          <button
            onClick={() => setShowAllRows(false)}
            className="text-body-small text-heat-100 hover:text-accent-crimson mt-3 font-medium transition-colors"
          >
            Show less
          </button>
        )}
      </div>

      {/* Step content below */}
      <div className="w-full">
        {/* Step 1: Email column selection */}
        {step === 1 && (
          <div className="stack space-y-6">
            <Card className="p-8 border-border-muted rounded-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6 sm:gap-2">
                  <h3 className="text-accent-black">
                    {emailColumn
                      ? "Email Column Detected:"
                      : "Select Email Column:"}
                  </h3>
                  {emailColumn ? (
                    <>
                      <span className="font-mono text-mono-medium bg-heat-12 px-4 py-2 rounded-full border border-heat-40 text-heat-100 font-medium">
                        {emailColumn}
                      </span>
                      {!showEmailDropdown && (
                        <Button
                          variant="tertiary"
                          size="default"
                          onClick={() => setShowEmailDropdown(true)}
                          className="text-heat-100 hover:text-accent-crimson hover:bg-white/50 transition-all"
                        >
                          Change
                        </Button>
                      )}
                      {showEmailDropdown && (
                        <Select
                          value={emailColumn}
                          onValueChange={(value) => {
                            setEmailColumn(value);
                            setShowEmailDropdownStep1(false);
                          }}
                        >
                          <SelectTrigger className="h-full w-[200px]">
                            <SelectValue placeholder="Change" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-border-muted">
                            {columns.map((col) => (
                              <SelectItem
                                key={col}
                                value={col}
                                className="text-body-medium"
                              >
                                {col}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </>
                  ) : (
                    <Select
                      value={emailColumn}
                      onValueChange={(value) => setEmailColumn(value)}
                    >
                      <SelectTrigger className="h-full w-[150px]">
                        <SelectValue
                          placeholder="Email Column"
                          className="text-body-medium"
                        />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-border-muted">
                        {columns.map((col) => (
                          <SelectItem
                            key={col}
                            value={col}
                            className="text-body-medium"
                          >
                            {col}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <Button
                  variant="primary"
                  size="default"
                  onClick={() => setStep(2)}
                  disabled={!emailColumn}
                >
                  Next
                </Button>
              </div>
            </Card>

            {/* Skip List Warning */}
            {emailColumn &&
              (() => {
                const commonDomains = [
                  "gmail.com",
                  "yahoo.com",
                  "hotmail.com",
                  "outlook.com",
                  "aol.com",
                  "icloud.com",
                ];
                const skippableEmails = rows.filter((row) => {
                  const email = row[emailColumn]?.toLowerCase();
                  if (!email) return false;
                  const domain = email.split("@")[1];
                  return domain && commonDomains.includes(domain);
                });

                if (skippableEmails.length === 0) return null;

                return (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-start rounded-md gap-4 p-4 sm:p-8 border border-heat-40 bg-heat-8">
                    <AlertCircle className="h-10 w-10 sm:h-16 sm:w-16 flex-shrink-0 text-heat-100" />

                    <div className="text-body-small text-accent-black">
                      <strong>{skippableEmails.length} emails</strong> from
                      common providers (Gmail, Yahoo, etc.) will be
                      automatically skipped to save API calls. These are
                      typically personal emails without company information.
                    </div>
                  </div>
                );
              })()}
          </div>
        )}

        {/* Email column info for step 2+ */}
        {step >= 2 && (
          <div className="mb-8 flex items-center justify-between p-6 bg-heat-8 rounded-md border border-heat-40">
            <div className="flex items-center gap-4">
              <span className="text-label-medium text-accent-black">
                Email Column:
              </span>
              <span className="font-mono text-mono-medium bg-white px-4 py-2 rounded-full border border-heat-40 text-heat-100">
                {emailColumn}
              </span>
            </div>
            {!showEmailDropdown && (
              <Button
                variant="tertiary"
                size="default"
                onClick={() => setShowEmailDropdown(true)}
                className="text-heat-100 hover:text-accent-crimson hover:bg-white/50 transition-all"
              >
                Change
              </Button>
            )}
            {showEmailDropdown && (
              <Select
                value={emailColumn}
                onValueChange={(value) => {
                  setEmailColumn(value);
                  setShowEmailDropdown(false);
                }}
              >
                <SelectTrigger className="h-full w-[200px] bg-white">
                  <SelectValue placeholder="Email Column" />
                </SelectTrigger>
                <SelectContent className="bg-white border-border-muted">
                  {columns.map((col) => (
                    <SelectItem
                      key={col}
                      value={col}
                      className="text-body-medium"
                    >
                      {col}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        {/* Step 2: Field Selection */}
        {step === 2 && (
          <div className="stack space-y-8">
            <Card className="p-8 border-border-muted bg-white">
              <div className="flex items-center justify-between mb-8">
                <p className="text-accent-black">
                  Select fields to enrich ({selectedFields.length}/10)
                </p>
                {/* Selected fields counter */}
                {selectedFields.length > 0 && (
                  <div className="text-body-small text-black-alpha-64">
                    {selectedFields.length} field
                    {selectedFields.length !== 1 ? "s" : ""} selected
                  </div>
                )}
              </div>

              {/* Preset fields */}
              <div className="stack space-y-6 mb-10">
                <Label className="text-label-large font-medium text-accent-black p-2">
                  Quick add fields
                </Label>
                <div className="flex flex-wrap gap-3">
                  {PRESET_FIELDS.map((field) => {
                    const isSelected = selectedFields.find(
                      (f) => f.name === field.name,
                    );
                    return (
                      <button
                        key={field.name}
                        disabled={selectedFields.length >= 10 && !isSelected}
                        onClick={() =>
                          isSelected
                            ? handleRemoveField(field.name)
                            : handleAddField(field)
                        }
                        className={cn(
                          "p-4 text-body-small rounded-full transition-all duration-200 font-medium border",
                          isSelected
                            ? "bg-accent-black text-white selected"
                            : "bg-background-lighter text-accent-black hover:bg-heat-8",
                          selectedFields.length >= 10 &&
                            !isSelected &&
                            "opacity-50 cursor-not-allowed",
                        )}
                      >
                        <span className="flex items-center gap-2 px-4">
                          {field.displayName}
                          {isSelected && <X size={14} />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Add additional fields section */}
              <div className="border-t border-border-muted pt-10">
                <Label className="mb-8 block text-title-h5 font-medium text-accent-black">
                  Add additional fields
                </Label>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Natural Language Card */}
                  <Card className="p-6 border-heat-40 hover:border-heat-100 transition-all duration-300 bg-background-lighter">
                    <Button
                      variant="secondary"
                      className="w-full justify-between p-0 bg-transparent"
                      onClick={() =>
                        setShowNaturalLanguage(!showNaturalLanguage)
                      }
                    >
                      <span className="flex items-center gap-3 font-medium text-label-large text-accent-black">
                        <Sparkles size={16} className="text-heat-100" />
                        Add with natural language
                      </span>
                      {showNaturalLanguage ? (
                        <ChevronUp size={16} className="text-black-alpha-56" />
                      ) : (
                        <ChevronDown
                          size={16}
                          className="text-black-alpha-56"
                        />
                      )}
                    </Button>

                    {showNaturalLanguage && (
                      <div className="mt-4 stack space-y-4">
                        <Textarea
                          placeholder="Describe the fields you want to add (e.g., 'I need the CEO name, company mission statement, and main product categories')"
                          value={naturalLanguageInput}
                          onChange={(e) =>
                            setNaturalLanguageInput(e.target.value)
                          }
                          rows={3}
                          className="border-heat-40 focus:border-heat-100 bg-white text-body-medium h-72"
                        />
                        <Button
                          onClick={handleGenerateFields}
                          disabled={
                            !naturalLanguageInput.trim() || isGenerating
                          }
                          variant="primary"
                          className="w-full button button-primary text-label-medium"
                        >
                          <span className="button-background" />
                          {isGenerating ? "Generating..." : "Generate Fields"}
                        </Button>
                      </div>
                    )}
                  </Card>

                  {/* Manual Add Card */}
                  <Card className="p-6 border-heat-40 hover:border-heat-100 transition-all duration-300 bg-background-lighter">
                    <Button
                      variant="secondary"
                      className="w-full justify-between p-0 bg-transparent"
                      onClick={() => setShowManualAdd(!showManualAdd)}
                    >
                      <span className="flex items-center gap-3 font-medium text-label-large text-accent-black">
                        <Plus size={16} className="text-heat-100" />
                        Add manually
                      </span>
                      {showManualAdd ? (
                        <ChevronUp size={16} className="text-black-alpha-56" />
                      ) : (
                        <ChevronDown
                          size={16}
                          className="text-black-alpha-56"
                        />
                      )}
                    </Button>

                    {showManualAdd && (
                      <div className="mt-6 stack space-y-4">
                        <Input
                          placeholder="Field name"
                          value={customField.name}
                          onChange={(e) =>
                            setCustomField({
                              ...customField,
                              name: e.target.value,
                            })
                          }
                          className="w-full border-heat-40 focus:border-heat-100 bg-white text-body-medium"
                        />
                        <Textarea
                          placeholder="Field description"
                          value={customField.description}
                          onChange={(e) =>
                            setCustomField({
                              ...customField,
                              description: e.target.value,
                            })
                          }
                          rows={2}
                          className="w-full border-heat-40 focus:border-heat-100 bg-white text-body-medium"
                        />
                        <Select
                          value={customField.type}
                          onValueChange={(
                            value: "string" | "number" | "boolean" | "array",
                          ) => setCustomField({ ...customField, type: value })}
                        >
                          <SelectTrigger className="w-full h-32 border-heat-40 focus:border-heat-100">
                            <SelectValue
                              className="text-body-medium"
                              placeholder="Select Type"
                            />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-border-muted">
                            <SelectItem
                              value="string"
                              className="text-body-medium"
                            >
                              Text
                            </SelectItem>
                            <SelectItem
                              value="number"
                              className="text-body-medium"
                            >
                              Number
                            </SelectItem>
                            <SelectItem
                              value="boolean"
                              className="text-body-medium"
                            >
                              Boolean
                            </SelectItem>
                            <SelectItem
                              value="array"
                              className="text-body-medium"
                            >
                              List
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          onClick={handleAddCustomField}
                          variant="primary"
                          className="w-full button button-primary text-label-medium"
                        >
                          <span className="button-background" />
                          Add Field
                        </Button>
                      </div>
                    )}
                  </Card>
                </div>
              </div>

              {/* Suggested fields */}
              {suggestedFields.length > 0 && (
                <div className="mt-8 stack space-y-4">
                  <Label className="text-label-large font-medium text-accent-black">
                    Suggested fields
                  </Label>
                  {suggestedFields.map((field, idx) => (
                    <Card
                      key={idx}
                      className="p-6 border-border-muted bg-background-lighter suggested-field-card"
                      style={{
                        animationDelay: `${idx * 100}ms`,
                        animationFillMode: "backwards",
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium text-label-medium text-accent-black">
                            {field.displayName}
                          </p>
                          <p className="text-body-small text-black-alpha-64 mt-1">
                            {field.description}
                          </p>
                        </div>
                        <div className="flex gap-3 ml-6">
                          <Button
                            size="default"
                            variant="primary"
                            onClick={() => {
                              handleAddField(field);
                              setSuggestedFields(
                                suggestedFields.filter((_, i) => i !== idx),
                              );
                            }}
                            className="button button-primary"
                          >
                            <span className="button-background" />
                            Accept
                          </Button>
                          <Button
                            size="default"
                            className="bg-accent-black text-white hover:bg-black-alpha-72"
                            onClick={() =>
                              setSuggestedFields(
                                suggestedFields.filter((_, i) => i !== idx),
                              )
                            }
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              <Button
                variant="primary"
                size="large"
                className="w-full mt-10"
                onClick={() => onStartEnrichment(emailColumn, selectedFields)}
                disabled={selectedFields.length === 0}
              >
                <Sparkles className="w-16 h-16" />
                Start Enrichment
              </Button>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
