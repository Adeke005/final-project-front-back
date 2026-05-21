function SkeletonCard({ lines = 3 }) {
  return (
    <article className="card skeleton-card">
      {Array.from({ length: lines }).map((_, index) => (
        <div key={index} className="skeleton-line" />
      ))}
    </article>
  );
}

export default SkeletonCard;
