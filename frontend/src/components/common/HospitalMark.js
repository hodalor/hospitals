function HospitalMark({ className = '' }) {
  return (
    <div className={`hospital-mark ${className}`.trim()} aria-hidden="true">
      <div className="hospital-mark-cross">
        <span />
        <span />
      </div>
      <div className="hospital-mark-stethoscope">
        <span className="hospital-mark-tube" />
        <span className="hospital-mark-ear hospital-mark-ear-left" />
        <span className="hospital-mark-ear hospital-mark-ear-right" />
        <span className="hospital-mark-chest" />
      </div>
    </div>
  );
}

export default HospitalMark;
