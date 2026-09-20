
const DigitInput = ({ value, onChange, onKeyDown, inputRef, index }) => {
  const handleChange = (e) => {
    // Permite letras y números, y convierte a mayúsculas
    const val = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (val.length <= 1) {
      onChange(val, index);
    }
  };

  const handleKeyDown = (e) => {
    if (onKeyDown) onKeyDown(e, index);
  };

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="text"
      autoCapitalize="characters"
      maxLength="1"
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      className="num w-full aspect-square min-w-0 text-center text-xl border border-linealt bg-bg text-ink uppercase focus:outline-none focus:border-ac focus:ring-1 focus:ring-acline transition-colors"
    />
  );
};

export default DigitInput;