export interface Contract {
  _id: number;
  reference_number: string;
  procurement_id: string;
  vendor_name: string;
  vendor_postal_code: string | null;
  buyer_name: string | null;
  contract_date: string;
  economic_object_code: string;
  description_en: string;
  description_fr: string;
  contract_period_start: string;
  delivery_date: string;
  contract_value: string;
  original_value: string;
  amendment_value: string;
  comments_en: string | null;
  commodity_type: string;
  commodity_code: string;
  country_of_vendor: string;
  solicitation_procedure: string;
  limited_tendering_reason: string;
  trade_agreement_exceptions: string;
  indigenous_business: string | null;
  former_public_servant: string;
  number_of_bids: string | null;
  article_6_exceptions: string | null;
  standing_offer_number: string | null;
  instrument_type: string;
  ministers_office: string;
}

export interface ApiResponse {
  success: boolean;
  result: {
    records: Contract[];
    total: number;
    _links: {
      next?: string;
    };
  };
}

export interface FlaggedContract {
  contract_id: string;
  vendor_name: string;
  value: string;
  description: string;
  original_value: string;
  amendment_value: string;
  start_date: string;
  end_date: string;
  number_of_bids: string | null;
  procurement_type: string;
  reason_for_flag: string;
  risk_level: 'high' | 'medium' | 'low';
  risk_factors: {
    procurement_issues?: string[];
    financial_issues?: string[];
    conflict_of_interest?: string[];
    timeline_issues?: string[];
    public_interest_factors?: string[];
  };
} 