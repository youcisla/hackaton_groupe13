"""
LLM-based structured data extraction using local Ollama models.
"""

import os
import json
import re
import requests
from typing import Optional
from dotenv import load_dotenv


load_dotenv()


class LLMExtractor:
    """Extract structured data from OCR text using local Ollama models."""
    
    def __init__(self, model_name: str = "llama3.1", ollama_url: str = "http://localhost:11434"):
        """
        Initialize the LLM extractor.
        
        Args:
            model_name: Ollama model to use for extraction (e.g., 'llama3.1', 'qwen2.5')
            ollama_url: URL of the Ollama server
        """
        self.model_name = model_name
        self.ollama_url = ollama_url
        
        self.schema = {
            "type": "object",
            "properties": {
                "document_type": {"type": "string"},
                "company_name": {"type": "string"},
                "siren": {"type": "string"},
                "siret": {"type": "string"},
                "invoice_number": {"type": "string"},
                "date": {"type": "string"},
                "amount": {"type": "string"}
            },
            "required": ["document_type"]
        }
    
    def _get_prompt_template(self, text: str) -> str:
        """Return the prompt template for data extraction."""
        return f"""You are an expert at extracting structured information from administrative documents (invoices, quotes, attestations).

Analyze the following OCR-extracted text and extract the requested fields. Return ONLY a valid JSON object with the following structure:

{{
  "document_type": "invoice|quote|attestation",
  "company_name": "extracted company name or empty string",
  "siren": "9-digit SIREN number or empty string",
  "siret": "14-digit SIRET number or empty string", 
  "invoice_number": "document reference number or empty string",
  "date": "date in YYYY-MM-DD format or empty string",
  "amount": "total amount as number without currency symbol or empty string"
}}

Rules:
- If a field cannot be found, use an empty string ""
- For amounts, extract only the numeric value (e.g., "1450" not "1450€")
- For dates, convert to ISO format YYYY-MM-DD
- Be precise with SIREN (9 digits) and SIRET (14 digits)
- Identify document type from context (invoice = "Facture", quote = "Devis", attestation = "Attestation")

OCR TEXT:
{text}

Return ONLY the JSON object, no other text:"""
    
    def extract(self, text: str) -> dict:
        """
        Extract structured data from OCR text.
        
        Args:
            text: OCR-extracted text from the document
            
        Returns:
            Dictionary with extracted fields
        """
        try:
            prompt = self._get_prompt_template(text)
            response = self._call_ollama(prompt)
            
            # Extract JSON from response
            json_str = self._extract_json_from_response(response)
            if json_str:
                return json.loads(json_str)
            else:
                raise ValueError("No JSON found in response")
        except Exception as e:
            print(f"LLM extraction error: {e}")
            return self._fallback_extraction(text)
    
    def _call_ollama(self, prompt: str) -> str:
        """
        Call Ollama API with the given prompt.
        
        Args:
            prompt: The prompt to send to Ollama
            
        Returns:
            Response from Ollama
        """
        url = f"{self.ollama_url}/api/generate"
        payload = {
            "model": self.model_name,
            "prompt": prompt,
            "stream": False,
            "temperature": 0.1
        }
        
        try:
            response = requests.post(url, json=payload, timeout=180)
            response.raise_for_status()
            result = response.json()
            return result.get("response", "")
        except requests.exceptions.RequestException as e:
            raise ValueError(f"Failed to connect to Ollama at {self.ollama_url}. Make sure Ollama is running: {e}")
    
    def _extract_json_from_response(self, response: str) -> Optional[str]:
        """
        Extract JSON string from LLM response.
        
        Args:
            response: Raw LLM response
            
        Returns:
            JSON string or None
        """
        # Try to find JSON in the response
        json_match = re.search(r'\{.*\}', response, re.DOTALL)
        if json_match:
            return json_match.group(0)
        return None
    
    def _fallback_extraction(self, text: str) -> dict:
        """
        Fallback extraction using regex patterns when LLM fails.
        
        Args:
            text: OCR-extracted text
            
        Returns:
            Dictionary with extracted fields
        """
        result = {
            "document_type": self._detect_document_type(text),
            "company_name": "",
            "siren": "",
            "siret": "",
            "invoice_number": "",
            "date": "",
            "amount": ""
        }
        
        siren_match = re.search(r'\b(\d{9})\b', text)
        if siren_match:
            result["siren"] = siren_match.group(1)
        
        siret_match = re.search(r'\b(\d{14})\b', text)
        if siret_match:
            result["siret"] = siret_match.group(1)
        
        invoice_match = re.search(
            r'(?:Facture|Invoice|N°|Ref)[:\s]*([A-Z0-9\-]+)', 
            text, 
            re.IGNORECASE
        )
        if invoice_match:
            result["invoice_number"] = invoice_match.group(1)
        
        date_match = re.search(
            r'(\d{2}[-/]\d{2}[-/]\d{4})', 
            text
        )
        if date_match:
            date_str = date_match.group(1).replace('/', '-')
            parts = date_str.split('-')
            if len(parts) == 3:
                result["date"] = f"{parts[2]}-{parts[1]}-{parts[0]}"
        
        amount_match = re.search(
            r'(?:Total|Montant|Amount)[:\s]*([\d\s,\.]+)\s*€', 
            text, 
            re.IGNORECASE
        )
        if amount_match:
            amount = amount_match.group(1).replace(' ', '').replace(',', '.')
            result["amount"] = amount
        
        return result
    
    def _detect_document_type(self, text: str) -> str:
        """
        Detect document type from text.
        
        Args:
            text: OCR-extracted text
            
        Returns:
            Document type string
        """
        text_lower = text.lower()
        
        if any(word in text_lower for word in ['facture', 'invoice', 'billing']):
            return "invoice"
        elif any(word in text_lower for word in ['devis', 'quote', 'quotation']):
            return "quote"
        elif any(word in text_lower for word in ['attestation', 'certificate']):
            return "attestation"
        else:
            return "unknown"
    
    def validate_output(self, data: dict) -> bool:
        """
        Validate extracted data against schema.
        
        Args:
            data: Extracted data dictionary
            
        Returns:
            Boolean indicating validity
        """
        required_fields = self.schema["required"]
        for field in required_fields:
            if field not in data:
                return False
        return True
