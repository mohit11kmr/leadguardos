import { StandardFinding } from '../core/types';
import { FindingBuilder } from '../reporting/findingBuilder';

export interface ImageDiagnostics {
  totalImages: number;
  lazyLoadedCount: number;
  missingLazyCount: number;
  modernFormatCount: number;
  missingDimensionsCount: number;
  responsiveCount: number;
  status: 'DETECTED' | 'ESTIMATED' | 'UNVERIFIED';
}

export class PerformanceDetector {
  public static analyzePerformance(
    htmlLength: number,
    totalTimeMs: number,
    html?: string
  ): {
    performance: {
      fetchTimeMs: number;
      parseTimeMs: number;
      totalTimeMs: number;
      images?: ImageDiagnostics;
    };
    findings: StandardFinding[];
  } {
    const findings: StandardFinding[] = [];
    const htmlSizeKB = Math.round(htmlLength / 1024);

    if (totalTimeMs > 4000) {
      findings.push(
        FindingBuilder.createFinding({
          id: 'perf_slow_server_response',
          category: 'performance',
          title: 'Slow Server Response Time (> 4.0 Seconds)',
          severity: 'HIGH',
          confidence: 'HIGH',
          detectedBy: 'STATIC',
          observed: `Initial HTML fetch completed in ${(totalTimeMs / 1000).toFixed(2)} seconds.`,
          inferred: 'Mobile visitors on 4G networks experience long blank screen delays before seeing CTA content.',
          evidence: `${totalTimeMs}ms initial response time`,
          impact: 'Bounce rates increase by up to 50% for load times exceeding 3 seconds.',
          recommendation: 'Enable server page caching, gzip compression, and CDN hosting.',
        })
      );
    }

    let imageDiag: ImageDiagnostics | undefined;

    if (typeof html === 'string') {
      const imgRegex = /<img\b[^>]*>/gi;
      const MAX_IMAGES = 50;
      let imgMatch: RegExpExecArray | null;
      let totalImages = 0;
      let lazyLoadedCount = 0;
      let modernFormatCount = 0;
      let missingDimensionsCount = 0;
      let responsiveCount = 0;

      while ((imgMatch = imgRegex.exec(html)) !== null && totalImages < MAX_IMAGES) {
        totalImages++;
        const tag = imgMatch[0];

        if (/loading=["']lazy["']/i.test(tag)) lazyLoadedCount++;
        if (/srcset=["']/i.test(tag)) responsiveCount++;

        const hasWidth = /width=["']\d+["']/i.test(tag);
        const hasHeight = /height=["']\d+["']/i.test(tag);
        if (!hasWidth && !hasHeight) missingDimensionsCount++;

        const srcMatch = /src=["']([^"']+)["']/i.exec(tag);
        const src = srcMatch ? srcMatch[1].toLowerCase() : '';
        if (src.endsWith('.webp') || src.endsWith('.avif') || src.endsWith('.svg') || src.includes('.webp?') || src.includes('.avif?')) {
          modernFormatCount++;
        }
      }

      const missingLazyCount = Math.max(0, totalImages - lazyLoadedCount);

      imageDiag = {
        totalImages,
        lazyLoadedCount,
        missingLazyCount,
        modernFormatCount,
        missingDimensionsCount,
        responsiveCount,
        status: totalImages > 0 ? 'DETECTED' : 'UNVERIFIED',
      };

      if (totalImages >= 4 && missingLazyCount >= 3) {
        findings.push(
          FindingBuilder.createFinding({
            id: 'perf_images_missing_lazy_loading',
            category: 'performance',
            title: 'Images Missing Native Lazy Loading Attributes',
            severity: 'LOW',
            confidence: 'HIGH',
            detectedBy: 'STATIC',
            observed: `${missingLazyCount} of ${totalImages} detected images do not use loading="lazy".`,
            inferred: 'Below-the-fold images are loaded eagerly, increasing initial page weight and time-to-interactive.',
            evidence: `${missingLazyCount}/${totalImages} images missing lazy loading`,
            impact: 'Slower initial render and wasted bandwidth for mobile visitors.',
            recommendation: 'Add loading="lazy" attribute to all images that are not immediately visible above the fold.',
          })
        );
      }

      if (totalImages >= 3 && modernFormatCount === 0) {
        findings.push(
          FindingBuilder.createFinding({
            id: 'perf_legacy_image_formats',
            category: 'performance',
            title: 'Legacy Image Formats In Use (Modern WebP / AVIF Recommended)',
            severity: 'LOW',
            confidence: 'HIGH',
            detectedBy: 'STATIC',
            observed: `All ${totalImages} detected images use legacy formats (PNG/JPEG/GIF) without WebP or AVIF variants.`,
            inferred: 'Modern image formats (WebP, AVIF) offer 25–35% smaller file sizes at equivalent visual fidelity.',
            evidence: `${totalImages} legacy format images`,
            impact: 'Increased page weight and slower mobile loading times.',
            recommendation: 'Convert static raster images to WebP/AVIF or serve through an automatic image-optimizing CDN.',
          })
        );
      }

      if (totalImages >= 3 && missingDimensionsCount >= 3) {
        findings.push(
          FindingBuilder.createFinding({
            id: 'perf_images_missing_dimensions',
            category: 'performance',
            title: 'Image Elements Missing Explicit Dimensions (CLS Risk)',
            severity: 'LOW',
            confidence: 'HIGH',
            detectedBy: 'STATIC',
            observed: `${missingDimensionsCount} of ${totalImages} images lack explicit width and height attributes.`,
            inferred: 'Browsers cannot allocate layout space before images load, causing content shifts during rendering.',
            evidence: `${missingDimensionsCount}/${totalImages} images missing width/height`,
            impact: 'Cumulative Layout Shift (CLS) Core Web Vital score degradation.',
            recommendation: 'Specify explicit width and height attributes or CSS aspect-ratio on image tags.',
          })
        );
      }
    }

    return {
      performance: {
        fetchTimeMs: Math.round(totalTimeMs * 0.8),
        parseTimeMs: Math.round(totalTimeMs * 0.2),
        totalTimeMs,
        images: imageDiag,
      },
      findings,
    };
  }
}
