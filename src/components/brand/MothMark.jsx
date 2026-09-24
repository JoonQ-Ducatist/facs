import mothLogoUrl from '../../assets/facs-moth-logo-transparent.png';

/** Shared mark uses the supplied artwork without client-side pixel processing. */
export default function MothMark({ className = '', width, height, alt = 'FACt.Smack 나방 심벌' }) {
  return <img src={mothLogoUrl} width={width} height={height} className={`moth-mark ${className}`} alt={alt} />;
}
