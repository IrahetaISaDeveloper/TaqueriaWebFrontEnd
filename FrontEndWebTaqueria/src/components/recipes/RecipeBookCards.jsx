// src/components/recipes/RecipeBookCards.jsx
import FAIcon from '../commons/FAIcon';

export const BOOKS = [
  {
    id: 'drinks',
    label: 'Libro de Bebidas',
    shortLabel: 'Bebidas',
    icon: 'wine-glass',
    desc: 'Cafés, coctelería y bebidas preparadas de casa',
    accent: 'border-warn/40 text-warn bg-warnsoft/30',
    activeAccent: 'border-ac bg-acsoft/10 text-ink',
    badgeTone: 'warn',
  },
  {
    id: 'dishes',
    label: 'Libro de Platillos',
    shortLabel: 'Platillos',
    icon: 'utensils',
    desc: 'Tacos, burritos, tortas y especialidades de cocina',
    accent: 'border-acline/40 text-ac bg-acsoft/30',
    activeAccent: 'border-ac bg-acsoft/10 text-ink',
    badgeTone: 'ac',
  },
  {
    id: 'extras',
    label: 'Libro de Extras',
    shortLabel: 'Extras',
    icon: 'star',
    desc: 'Salsas de la casa y preparaciones compuestas con stock',
    accent: 'border-ok/40 text-ok bg-oksoft/30',
    activeAccent: 'border-ac bg-acsoft/10 text-ink',
    badgeTone: 'ok',
  },
];

export default function RecipeBookCards({ activeBookId, onSelectBook, counts = {} }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-7">
      {BOOKS.map((book) => {
        const isActive = activeBookId === book.id;
        const count = counts[book.id] || 0;

        return (
          <button
            key={book.id}
            type="button"
            onClick={() => onSelectBook(book.id)}
            className={`group text-left p-4 sm:p-5 border transition-all duration-150 relative cursor-pointer flex flex-col justify-between ${
              isActive
                ? 'bg-surface border-ac shadow-sm ring-1 ring-ac/20'
                : 'bg-surface border-line hover:border-linealt hover:bg-surfalt/60'
            }`}
          >
            {/* Indicador superior del libro activo */}
            {isActive && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-ac" />
            )}

            <div>
              <div className="flex items-center justify-between gap-3 mb-2.5">
                <div
                  className={`w-9 h-9 flex items-center justify-center border transition-colors ${
                    isActive
                      ? 'bg-ac text-white border-ac'
                      : 'bg-surfalt text-inkalt border-line group-hover:border-linealt'
                  }`}
                >
                  <FAIcon icon={book.icon} size="base" />
                </div>

                <span
                  className={`kick px-2.5 py-1 num font-semibold border ${
                    isActive
                      ? 'bg-acsoft text-ac border-acline'
                      : 'bg-surfalt text-muted border-line'
                  }`}
                >
                  {count} {count === 1 ? 'receta' : 'recetas'}
                </span>
              </div>

              <h3 className={`font-display text-base font-bold transition-colors ${
                isActive ? 'text-ink' : 'text-ink group-hover:text-ac'
              }`}>
                {book.label}
              </h3>

              <p className="text-xs text-muted mt-1 leading-relaxed line-clamp-2">
                {book.desc}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-line flex items-center justify-between text-xs">
              <span className={`kick font-semibold ${isActive ? 'text-ac' : 'text-muted'}`}>
                {isActive ? 'Libro abierto' : 'Abrir libro'}
              </span>
              <FAIcon
                icon={isActive ? 'eye' : 'arrow-right'}
                size="xs"
                className={`transition-transform ${
                  isActive ? 'text-ac' : 'text-muted group-hover:translate-x-0.5'
                }`}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}
