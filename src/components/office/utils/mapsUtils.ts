/**
 * Extracts latitude and longitude from various Google Maps URL formats
 * Supported formats:
 * - https://maps.google.com/?q=lat,lng
 * - https://www.google.com/maps/place/@lat,lng,zoom
 * - https://maps.app.goo.gl/... (needs special handling)
 * - https://goo.gl/maps/... (needs special handling)
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export class MapsLinkParser {
  /**
   * Validates and extracts coordinates from a Google Maps link
   * @param url Google Maps URL
   * @returns Coordinates object or null if invalid
   */
  static extractCoordinates(url: string): Coordinates | null {
    if (!url || typeof url !== 'string') return null;
    
    // Clean the URL
    const trimmedUrl = url.trim();
    
    // Try different URL patterns
    const patterns = [
      // Pattern: @lat,lng or @lat,lng,zoom
      this.extractFromAtPattern,
      // Pattern: ?q=lat,lng
      this.extractFromQueryPattern,
      // Pattern: /search/lat,lng
      this.extractFromSearchPattern,
      // Pattern: ll=lat,lng
      this.extractFromLlPattern,
      // Pattern: center=lat,lng
      this.extractFromCenterPattern,
      // Handle short links by attempting to fetch (requires backend proxy)
      this.extractFromShortLink
    ];
    
    for (const pattern of patterns) {
      const coords = pattern.call(this, trimmedUrl);
      if (coords) return coords;
    }
    
    return null;
  }
  
  /**
   * Extracts from @lat,lng or @lat,lng,zoom pattern
   * Example: https://www.google.com/maps/place/@40.7128,-74.0060,15z
   */
  private static extractFromAtPattern(url: string): Coordinates | null {
    const atRegex = /@([-+]?\d*\.?\d+),([-+]?\d*\.?\d+)/;
    const match = url.match(atRegex);
    
    if (match && match.length >= 3) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      
      if (this.isValidCoordinate(lat, lng)) {
        return { latitude: lat, longitude: lng };
      }
    }
    return null;
  }
  
  /**
   * Extracts from ?q=lat,lng pattern
   * Example: https://maps.google.com/?q=40.7128,-74.0060
   */
  private static extractFromQueryPattern(url: string): Coordinates | null {
    try {
      const urlObj = new URL(url);
      const queryParam = urlObj.searchParams.get('q') || urlObj.searchParams.get('query');
      
      if (queryParam) {
        // Check if it's in lat,lng format
        const coords = queryParam.split(',');
        if (coords.length >= 2) {
          const lat = parseFloat(coords[0].trim());
          const lng = parseFloat(coords[1].trim());
          
          if (this.isValidCoordinate(lat, lng)) {
            return { latitude: lat, longitude: lng };
          }
        }
      }
    } catch (e) {
      // Invalid URL, ignore
    }
    return null;
  }
  
  /**
   * Extracts from /search/lat,lng pattern
   * Example: https://www.google.com/maps/search/40.7128,-74.0060
   */
  private static extractFromSearchPattern(url: string): Coordinates | null {
    const searchRegex = /\/search\/([-+]?\d*\.?\d+),([-+]?\d*\.?\d+)/;
    const match = url.match(searchRegex);
    
    if (match && match.length >= 3) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      
      if (this.isValidCoordinate(lat, lng)) {
        return { latitude: lat, longitude: lng };
      }
    }
    return null;
  }
  
  /**
   * Extracts from ll=lat,lng pattern
   * Example: https://www.google.com/maps?ll=40.7128,-74.0060&z=15
   */
  private static extractFromLlPattern(url: string): Coordinates | null {
    try {
      const urlObj = new URL(url);
      const llParam = urlObj.searchParams.get('ll');
      
      if (llParam) {
        const coords = llParam.split(',');
        if (coords.length >= 2) {
          const lat = parseFloat(coords[0].trim());
          const lng = parseFloat(coords[1].trim());
          
          if (this.isValidCoordinate(lat, lng)) {
            return { latitude: lat, longitude: lng };
          }
        }
      }
    } catch (e) {
      // Invalid URL, ignore
    }
    return null;
  }
  
  /**
   * Extracts from center=lat,lng pattern
   * Example: https://www.google.com/maps?center=40.7128,-74.0060&zoom=15
   */
  private static extractFromCenterPattern(url: string): Coordinates | null {
    try {
      const urlObj = new URL(url);
      const centerParam = urlObj.searchParams.get('center');
      
      if (centerParam) {
        const coords = centerParam.split(',');
        if (coords.length >= 2) {
          const lat = parseFloat(coords[0].trim());
          const lng = parseFloat(coords[1].trim());
          
          if (this.isValidCoordinate(lat, lng)) {
            return { latitude: lat, longitude: lng };
          }
        }
      }
    } catch (e) {
      // Invalid URL, ignore
    }
    return null;
  }
  
  /**
   * Handles short links (goo.gl, maps.app.goo.gl)
   * Note: This requires a backend proxy or a service to resolve short links
   */
  private static extractFromShortLink(url: string): Coordinates | null {
    // Check if it's a short link
    if (url.includes('goo.gl') || url.includes('maps.app.goo.gl')) {
      console.warn('Short links require resolution. Consider implementing a backend proxy.');
      // You could return a special marker or show a message to the user
      // For now, we'll return null and show validation error
    }
    return null;
  }
  
  /**
   * Validates if coordinates are within reasonable ranges
   */
  static isValidCoordinate(lat: number, lng: number): boolean {
    return (
      !isNaN(lat) && 
      !isNaN(lng) && 
      lat >= -90 && 
      lat <= 90 && 
      lng >= -180 && 
      lng <= 180
    );
  }
  
  /**
   * Validates a Google Maps link and returns coordinates or throws error
   */
  static validateAndExtract(url: string): Coordinates {
    const coords = this.extractCoordinates(url);
    
    if (!coords) {
      throw new Error(
        'Invalid Google Maps link. Please provide a valid link containing coordinates.\n' +
        'Example: https://maps.google.com/?q=40.7128,-74.0060 or\n' +
        'https://www.google.com/maps/place/@40.7128,-74.0060,15z'
      );
    }
    
    return coords;
  }
}