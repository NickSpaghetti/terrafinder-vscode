export interface TerraformRegistryResponse {
    id:           string;
    owner:        string;
    namespace:    string;
    name:         string;
    alias:        null;
    version:      string;
    tag:          string;
    description:  string;
    source:       string;
    published_at: Date;
    downloads:    number;
    tier:         string;
    logo_url:     string;
    versions:     string[];
}