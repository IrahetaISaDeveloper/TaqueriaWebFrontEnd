// src/pages/Recipes.jsx
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import MenuPageShell, { MENU_PRIMARY_BUTTON } from '../components/menu/MenuPageShell';
import MenuHero from '../components/menu/MenuHero';
import MenuAttentionBanner from '../components/menu/MenuAttentionBanner';
import RecipeBookCards, { BOOKS } from '../components/recipes/RecipeBookCards';
import RecipeCard from '../components/recipes/RecipeCard';
import RecipeBookSheet from '../components/recipes/RecipeBookSheet';
import RecipeDetailModal from '../components/recipes/RecipeDetailModal';
import PaginationControls from '../components/commons/PaginationControls';
import FAIcon from '../components/commons/FAIcon';
import ReportButton from '../components/commons/ReportButton';
import useDrinks from '../hooks/useDrinks';
import useSaucers from '../hooks/useSaucers';
import useExtras from '../hooks/useExtras';
import { usePagination } from '../hooks/usePagination';
import { ToastProvider } from '../components/commons/ToastProvider';
import { recipesReportColumns } from '../constants/reportConfigs';

const DISH_CATEGORIES = ['Burritos', 'Tortas', 'Tacos', 'Sopas', 'Especiales'];

const EDIT_ROUTES = {
  drinks: { path: '/drinks', label: 'Editar en Bebidas' },
  dishes: { path: '/dishes', label: 'Editar en Platillos' },
  extras: { path: '/extras', label: 'Editar en Extras' },
};

const EMPTY_BOOK_HINTS = {
  drinks: 'Agrega ingredientes al crear o editar una bebida de casa desde el catálogo de Bebidas.',
  dishes: 'Agrega ingredientes al crear o editar un platillo desde el catálogo de Platillos.',
  extras: 'Marca un extra como "compuesto" y agrégale insumos desde la pantalla de Extras.',
};

// Convierte los ingredientes de Extras al esquema compartido { name, tracked, quantity, unit }
const extraToRecipeShape = (extra) => ({
  ...extra,
  recipe: (extra.ingredients || []).map((item) => ({
    name: item.ingredientId?.name || 'Insumo no encontrado',
    tracked: Boolean(item.ingredientId),
    quantity: item.quantity,
    unit: item.unit,
  })),
});

function RecipesContent() {
  const [activeMenu] = useState('recipes');
  const [typeFilter, setTypeFilter] = useState('drinks');
  const [subFilter, setSubFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'book'
  const [bookPageIndex, setBookPageIndex] = useState(0);
  const [detailModalRecipe, setDetailModalRecipe] = useState(null);

  const { drinks, loading: loadingDrinks } = useDrinks();
  const { saucers, loading: loadingSaucers } = useSaucers();
  const { extras, loading: loadingExtras } = useExtras();

  // Filtrado de elementos que poseen recetas registradas
  const drinksWithRecipe = useMemo(
    () => drinks.filter((d) => d.category === 'casa' && d.recipe?.length > 0),
    [drinks]
  );
  const dishesWithRecipe = useMemo(
    () => saucers.filter((d) => d.recipe?.length > 0),
    [saucers]
  );
  const extrasWithRecipe = useMemo(
    () =>
      extras
        .filter((e) => e.isCompound && e.ingredients?.length > 0)
        .map(extraToRecipeShape),
    [extras]
  );

  // Elementos sin receta para banners de atención
  const dishesMissingRecipe = useMemo(
    () => saucers.filter((d) => !d.recipe || d.recipe.length === 0),
    [saucers]
  );
  const drinksMissingRecipe = useMemo(
    () => drinks.filter((d) => d.category === 'casa' && (!d.recipe || d.recipe.length === 0)),
    [drinks]
  );
  const extrasMissingRecipe = useMemo(
    () => extras.filter((e) => e.isCompound && (!e.ingredients || e.ingredients.length === 0)),
    [extras]
  );

  const MISSING_BY_BOOK = {
    drinks: drinksMissingRecipe,
    dishes: dishesMissingRecipe,
    extras: extrasMissingRecipe,
  };

  // Opciones de subcategorías por libro
  const subOptionsForDrinks = useMemo(
    () => ['all', ...new Set(drinksWithRecipe.map((d) => d.subcategory).filter(Boolean))],
    [drinksWithRecipe]
  );
  const subOptionsForDishes = useMemo(
    () => ['all', ...DISH_CATEGORIES],
    []
  );
  const subOptionsForExtras = useMemo(
    () => ['all', ...new Set(extrasWithRecipe.map((e) => e.category).filter(Boolean))],
    [extrasWithRecipe]
  );

  const SUB_OPTIONS_BY_BOOK = {
    drinks: subOptionsForDrinks,
    dishes: subOptionsForDishes,
    extras: subOptionsForExtras,
  };
  const subOptions = SUB_OPTIONS_BY_BOOK[typeFilter] || ['all'];

  const currentBookItems = useMemo(() => {
    if (typeFilter === 'drinks') return drinksWithRecipe;
    if (typeFilter === 'dishes') return dishesWithRecipe;
    if (typeFilter === 'extras') return extrasWithRecipe;
    return [];
  }, [typeFilter, drinksWithRecipe, dishesWithRecipe, extrasWithRecipe]);

  const LOADING_BY_BOOK = {
    drinks: loadingDrinks,
    dishes: loadingSaucers,
    extras: loadingExtras,
  };
  const loading = LOADING_BY_BOOK[typeFilter] || false;

  // Filtrado por categoría y término de búsqueda (nombre o ingrediente)
  const filteredItems = useMemo(() => {
    return currentBookItems.filter((item) => {
      const itemCat = typeFilter === 'drinks' ? item.subcategory : item.category;
      const matchesCat = subFilter === 'all' || itemCat === subFilter;
      if (!matchesCat) return false;

      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase().trim();
      const title = (item.title || item.name || '').toLowerCase();
      const cat = (itemCat || '').toLowerCase();
      const matchesIngredient = (item.recipe || []).some((ing) =>
        (ing.name || '').toLowerCase().includes(term)
      );

      return title.includes(term) || cat.includes(term) || matchesIngredient;
    });
  }, [currentBookItems, typeFilter, subFilter, searchTerm]);

  // Paginación para vista en cuadrícula (8 por página)
  const { page, totalPages, paginatedItems, goTo, next, prev, setPage } = usePagination(filteredItems, 8);

  // Conteo de insumos únicos utilizados en este libro
  const uniqueIngredientsCount = useMemo(() => {
    const set = new Set();
    currentBookItems.forEach((item) => {
      (item.recipe || []).forEach((ing) => {
        if (ing.name) set.add(ing.name.toLowerCase().trim());
      });
    });
    return set.size;
  }, [currentBookItems]);

  const activeBook = BOOKS.find((b) => b.id === typeFilter) || BOOKS[0];
  const editRoute = EDIT_ROUTES[typeFilter];

  const handleBookChange = (id) => {
    if (id === typeFilter) return;
    setTypeFilter(id);
    setSubFilter('all');
    setSearchTerm('');
    setPage(1);
    setBookPageIndex(0);
  };

  const handleSubFilterChange = (cat) => {
    setSubFilter(cat);
    setPage(1);
    setBookPageIndex(0);
  };

  const handleViewDetail = (item) => {
    setDetailModalRecipe(item);
  };

  const countsByBook = {
    drinks: drinksWithRecipe.length,
    dishes: dishesWithRecipe.length,
    extras: extrasWithRecipe.length,
  };

  const totalAllRecipes = drinksWithRecipe.length + dishesWithRecipe.length + extrasWithRecipe.length;

  return (
    <MenuPageShell
      activeMenu={activeMenu}
      subtitle="Fichas técnicas y composición de insumos para bebidas de la casa, platillos y extras"
      actions={
        <>
          <ReportButton
            compact
            label="Exportar recetario"
            title={`Recetas - ${activeBook.label}`}
            subtitle={subFilter === 'all' ? undefined : `Categoría: ${subFilter}`}
            columns={recipesReportColumns}
            rows={filteredItems.map((item) => ({ ...item, __type: activeBook.shortLabel }))}
            itemTag="receta"
            summary={[
              { label: 'Recetas en filtro', value: filteredItems.length },
              { label: 'Libro activo', value: activeBook.label },
              { label: 'Insumos únicos', value: uniqueIngredientsCount },
            ]}
          />
          {editRoute && (
            <Link to={editRoute.path} className={MENU_PRIMARY_BUTTON}>
              <FAIcon icon="pen" size="xs" />
              {editRoute.label}
            </Link>
          )}
        </>
      }
      modals={
        <RecipeDetailModal
          isOpen={Boolean(detailModalRecipe)}
          onClose={() => setDetailModalRecipe(null)}
          recipe={detailModalRecipe}
          editRoute={editRoute}
          bookLabel={activeBook.label}
        />
      }
    >
      {/* Resumen Hero de Métricas */}
      <MenuHero
        loading={loading}
        primary={{
          kick: `Recetas en ${activeBook.label}`,
          value: filteredItems.length,
          suffix: `de ${currentBookItems.length} registradas`,
          note: `Fichas técnicas activas. Los insumos configurados descuentan inventario automáticamente al venderse.`,
          noteTone: 'ok',
        }}
        secondary={[
          {
            kick: 'Insumos utilizados',
            value: uniqueIngredientsCount,
            label: 'Ingredientes únicos en este libro',
          },
          {
            kick: 'Catálogo global',
            value: totalAllRecipes,
            label: `${drinksWithRecipe.length} bebidas · ${dishesWithRecipe.length} platillos · ${extrasWithRecipe.length} extras`,
          },
        ]}
      />

      {/* Selector de los Tres Libros de Recetas */}
      <RecipeBookCards
        activeBookId={typeFilter}
        onSelectBook={handleBookChange}
        counts={countsByBook}
      />

      {/* Banner de atención si hay productos sin receta */}
      {MISSING_BY_BOOK[typeFilter]?.length > 0 && (
        <MenuAttentionBanner
          items={MISSING_BY_BOOK[typeFilter]}
          getKey={(i) => i._id || i.name}
          getTitle={(i) => i.name || i.title}
          noun={['producto', 'productos']}
          reason="no tiene receta o ingredientes vinculados"
        />
      )}

      {/* Barra de Filtros, Buscador y Conmutador de Vistas */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-4 border-b border-line">
        {/* Chips de Categorías */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="kick text-muted mr-1.5 font-bold">Categoría</span>
          {subOptions.map((c) => {
            const active = subFilter === c;
            const label = c === 'all' ? 'Todas' : c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => handleSubFilterChange(c)}
                className={`px-3 py-1 rounded-none border text-xs font-display transition-colors cursor-pointer ${
                  active
                    ? 'border-ac text-ac bg-acsoft font-semibold'
                    : 'border-line text-inkalt hover:border-linealt hover:bg-surfalt'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Buscador en tiempo real y selector de vista */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] sm:min-w-[260px]">
            <FAIcon
              icon="magnifying-glass"
              size="xs"
              className="absolute left-3 top-3 text-muted"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
                setBookPageIndex(0);
              }}
              placeholder="Buscar receta o ingrediente..."
              className="w-full pl-8 pr-3 py-1.5 bg-surface border border-line text-xs text-ink placeholder:text-muted focus:outline-none focus:border-ac transition-colors"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-muted hover:text-ink text-xs"
                title="Limpiar búsqueda"
              >
                <FAIcon icon="times" size="xs" />
              </button>
            )}
          </div>

          {/* Toggle de Modo de Visualización */}
          <div className="flex items-center border border-line bg-surface p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-display font-medium transition-colors cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-ac text-white font-semibold'
                  : 'text-muted hover:text-ink hover:bg-surfalt'
              }`}
              title="Vista de catálogo en cuadrícula"
            >
              <FAIcon icon="layer-group" size="xs" />
              <span className="hidden sm:inline">Cuadrícula</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('book')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-display font-medium transition-colors cursor-pointer ${
                viewMode === 'book'
                  ? 'bg-ac text-white font-semibold'
                  : 'text-muted hover:text-ink hover:bg-surfalt'
              }`}
              title="Vista de libro / ficha técnica editorial"
            >
              <FAIcon icon="feather" size="xs" />
              <span className="hidden sm:inline">Libro / Ficha</span>
            </button>
          </div>
        </div>
      </div>

      {/* Indicador de carga */}
      {loading && (
        <div className="flex justify-center items-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-ac"></div>
          <span className="ml-3 text-sm text-muted font-medium">Abriendo {activeBook.label}...</span>
        </div>
      )}

      {/* Estado vacío si no hay recetas */}
      {!loading && currentBookItems.length === 0 && (
        <div className="border border-dashed border-line bg-surface p-12 text-center my-6">
          <div className="w-12 h-12 mx-auto flex items-center justify-center bg-surfalt border border-line text-muted mb-3">
            <FAIcon icon={activeBook.icon} size="xl" />
          </div>
          <h3 className="font-display font-bold text-lg text-ink mb-1">
            Este libro todavía no tiene recetas registradas
          </h3>
          <p className="text-sm text-muted max-w-md mx-auto mb-5 leading-relaxed">
            {EMPTY_BOOK_HINTS[typeFilter] || EMPTY_BOOK_HINTS.dishes}
          </p>
          {editRoute && (
            <Link to={editRoute.path} className={MENU_PRIMARY_BUTTON}>
              {editRoute.label}
            </Link>
          )}
        </div>
      )}

      {/* Estado vacío por filtros o búsqueda */}
      {!loading && currentBookItems.length > 0 && filteredItems.length === 0 && (
        <div className="border border-dashed border-line bg-surface p-10 text-center my-6">
          <p className="kick text-muted mb-2 font-bold">Sin resultados</p>
          <p className="text-sm text-inkalt mb-4">
            No se encontraron recetas con el filtro actual o término "{searchTerm}".
          </p>
          <button
            type="button"
            onClick={() => {
              setSubFilter('all');
              setSearchTerm('');
            }}
            className="px-4 py-2 border border-line bg-surface text-xs font-display font-semibold text-ink hover:border-ac hover:text-ac transition-colors"
          >
            Restablecer filtros
          </button>
        </div>
      )}

      {/* Vista 1: Cuadrícula de Fichas de Recetas */}
      {!loading && filteredItems.length > 0 && viewMode === 'grid' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {paginatedItems.map((item, idx) => (
              <RecipeCard
                key={item._id || `${item.name}-${idx}`}
                recipeItem={item}
                editRoute={editRoute}
                bookIcon={activeBook.icon}
                onViewDetail={handleViewDetail}
              />
            ))}
          </div>

          <PaginationControls
            compact
            page={page}
            totalPages={totalPages}
            onPrev={prev}
            onNext={next}
            onGoTo={goTo}
          />
        </>
      )}

      {/* Vista 2: Libro Editorial Interactivo (Ficha Técnica / Ficha de Cocina) */}
      {!loading && filteredItems.length > 0 && viewMode === 'book' && (
        <RecipeBookSheet
          recipes={filteredItems}
          currentIndex={Math.min(bookPageIndex, filteredItems.length - 1)}
          onSelectIndex={setBookPageIndex}
          editRoute={editRoute}
          activeBook={activeBook}
        />
      )}
    </MenuPageShell>
  );
}

export default function Recipes() {
  return (
    <ToastProvider>
      <RecipesContent />
    </ToastProvider>
  );
}
