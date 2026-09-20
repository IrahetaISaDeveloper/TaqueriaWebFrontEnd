// src/components/commons/Card.jsx
const Card = ({ children, className = '', accent = false, ...props }) => {
  return (
    <div
      className={`
        bg-surface rounded-none
        border border-line
        ${accent ? 'border-l-4 border-l-red-500' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;