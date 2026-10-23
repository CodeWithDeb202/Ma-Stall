
'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Warning from '../reusable/Warning';

export default function MenuItemDetails({
  itemId,
  isAdmin = false,
  isPublic = false,
  backHref = '/',
}) {
  const router = useRouter();
  const Layout = isPublic ? Fragment : DashboardLayout;

  const [item, setItem] = useState(null);
  const [activeImage, setActiveImage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewMessage, setReviewMessage] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');
  const [sessionUserId, setSessionUserId] = useState('');
  const [sessionRole, setSessionRole] = useState('');
  const [reviewDeleteConfirmOpen, setReviewDeleteConfirmOpen] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState(null);
  const [deletingReview, setDeletingReview] = useState(false);
  const [reviewDeleteError, setReviewDeleteError] = useState('');

  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editIngredients, setEditIngredients] = useState([]);
  const [ingredientMode, setIngredientMode] = useState('new');
  const [replaceIngredientIndex, setReplaceIngredientIndex] = useState('');
  const [ingredientInput, setIngredientInput] = useState('');
  const [replacedIngredientIndexes, setReplacedIngredientIndexes] = useState([]);
  const [editPrice, setEditPrice] = useState('');
  const [editOffer, setEditOffer] = useState('');
  const [editFiles, setEditFiles] = useState([]);

  const loadReviews = useCallback(async () => {
    if ((!isPublic && !isAdmin) || !itemId) return;

    try {
      const response = await fetch(
        `/api/menu-items/public/${encodeURIComponent(itemId)}/reviews`,
        { credentials: 'include', cache: 'no-store' }
      );
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Could not load reviews.');
      }

      setReviews(Array.isArray(result.reviews) ? result.reviews : []);
      setAverageRating(Number(result.averageRating || 0));
      setReviewCount(Number(result.reviewCount || 0));
    } catch (err) {
      console.error('Load reviews failed:', err);
    }
  }, [itemId, isPublic, isAdmin]);

  useEffect(() => {
    if (!isPublic && !isAdmin) return;

    let cancelled = false;

    fetch('/api/auth/session', {
      credentials: 'include',
      cache: 'no-store',
    })
      .then(async (response) => {
        const session = await response.json().catch(() => ({}));
        if (!cancelled && response.ok && session.authenticated) {
          setSessionUserId(String(session.userId || ''));
          setSessionRole(session.role || '');
        } else if (!cancelled) {
          setSessionUserId('');
          setSessionRole('');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSessionUserId('');
          setSessionRole('');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isPublic, isAdmin]);

  const handleDeleteReview = async () => {
    if (!reviewToDelete?._id || deletingReview) return;

    setDeletingReview(true);
    setReviewDeleteError('');

    try {
      const response = await fetch(
        `/api/menu-items/${encodeURIComponent(itemId)}/reviews/${encodeURIComponent(reviewToDelete._id)}`,
        {
          method: 'DELETE',
          credentials: 'include',
          cache: 'no-store',
        }
      );
      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Could not delete review.');
      }

      setReviews((current) =>
        current.filter((review) => String(review._id) !== String(reviewToDelete._id))
      );
      setAverageRating(Number(result.averageRating || 0));
      setReviewCount(Number(result.reviewCount || 0));
      setReviewDeleteConfirmOpen(false);
      setReviewToDelete(null);
      await loadReviews();
    } catch (err) {
      setReviewDeleteError(err.message || 'Could not delete review.');
    } finally {
      setDeletingReview(false);
    }
  };

  const handleReviewClick = async () => {
    setReviewError('');
    setReviewSuccess('');

    try {
      const response = await fetch('/api/auth/session', {
        credentials: 'include',
        cache: 'no-store',
      });
      const session = await response.json().catch(() => ({}));

      if (!response.ok || !session.authenticated) {
        const next = `/menu-items/${itemId}`;
        router.push(`/auth/login?next=${encodeURIComponent(next)}`);
        return;
      }

      if (session.role !== 'user') {
        setReviewError('Only a normal user account can submit a review.');
        return;
      }

      setReviewModalOpen(true);
    } catch {
      setReviewError('Could not verify your login. Please try again.');
    }
  };

  const handleReviewSubmit = async (event) => {
    event.preventDefault();
    setReviewError('');
    setReviewSuccess('');

    const message = reviewMessage.trim();
    if (message.length < 2 || message.length > 300) {
      setReviewError('Review message must be between 2 and 300 characters.');
      return;
    }

    if (!Number.isInteger(reviewRating) || reviewRating < 1 || reviewRating > 5) {
      setReviewError('Please select a rating from 1 to 5 stars.');
      return;
    }

    setReviewSubmitting(true);

    try {
      const response = await fetch(
        `/api/menu-items/${encodeURIComponent(itemId)}/reviews`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, rating: reviewRating }),
        }
      );
      const result = await response.json().catch(() => ({}));

      if (response.status === 401) {
        router.push(`/auth/login?next=${encodeURIComponent(`/menu-items/${itemId}`)}`);
        return;
      }

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Could not submit your review.');
      }

      setReviewSuccess('Your review was submitted successfully.');
      setReviewMessage('');
      setReviewRating(5);
      setReviewModalOpen(false);
      await loadReviews();
      await loadItem();
    } catch (err) {
      setReviewError(err.message || 'Could not submit your review.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const loadItem = async () => {
    setLoading(true);
    setError('');

    try {
      const endpoint = isPublic
        ? `/api/menu-items/public/${encodeURIComponent(itemId)}`
        : `/api/menu-items/${encodeURIComponent(itemId)}`;

      const response = await fetch(endpoint, {
        credentials: 'include',
        cache: 'no-store',
      });

      const result = await response.json();

      const loadedItem = result.item;

      if (!response.ok || !result.success || !loadedItem) {
        throw new Error(
          result.message || 'Unable to load the menu item.'
        );
      }

      setItem(loadedItem);
      setActiveImage(0);
    } catch (err) {
      setError(err.message || 'Unable to load the menu item.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const fetchReviews = async () => {
      if ((!isPublic && !isAdmin) || !itemId) return;

      try {
        const response = await fetch(
          `/api/menu-items/public/${encodeURIComponent(itemId)}/reviews`,
          { credentials: 'include', cache: 'no-store' }
        );
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Could not load reviews.');
        }

        if (!cancelled) {
          setReviews(Array.isArray(result.reviews) ? result.reviews : []);
          setAverageRating(Number(result.averageRating || 0));
          setReviewCount(Number(result.reviewCount || 0));
        }
      } catch (err) {
        if (!cancelled) console.error('Load reviews failed:', err);
      }
    };

    fetchReviews();
    return () => { cancelled = true; };
  }, [itemId, isPublic, isAdmin]);

  useEffect(() => {
  let cancelled = false;

  const fetchItem = async () => {
    setLoading(true);
    setError('');

    try {
      const endpoint = isPublic
        ? `/api/menu-items/public/${encodeURIComponent(itemId)}`
        : `/api/menu-items/${encodeURIComponent(itemId)}`;

      const response = await fetch(endpoint, {
        credentials: 'include',
        cache: 'no-store',
      });

      const result = await response.json();
      const loadedItem = result.item;

      if (!response.ok || !result.success || !loadedItem) {
        throw new Error(
          result.message || 'Unable to load the menu item.'
        );
      }

      if (!cancelled) {
        setItem(loadedItem);
        setActiveImage(0);
      }
    } catch (err) {
      if (!cancelled) {
        setError(err.message || 'Unable to load the menu item.');
      }
    } finally {
      if (!cancelled) {
        setLoading(false);
      }
    }
  };

  fetchItem();

  return () => {
    cancelled = true;
  };
}, [itemId, isPublic, isAdmin]);


  const openEditModal = () => {
    setEditName(item?.name || '');
    setEditDescription(item?.description || '');
    setEditIngredients(
      Array.isArray(item?.ingredients) ? [...item.ingredients] : []
    );
    setIngredientMode('new');
    setReplaceIngredientIndex('');
    setIngredientInput('');
    setReplacedIngredientIndexes([]);
    setEditPrice(String(item?.price ?? ''));
    setEditOffer(item?.offer || '');
    setEditFiles([]);
    setEditError('');
    setEditOpen(true);
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    setEditError('');

    const ingredients = editIngredients
      .map((value) => value.trim())
      .filter(Boolean);

    if (!editName.trim() || !editDescription.trim() || ingredients.length === 0) {
      setEditError('Name, description au at least one ingredient darkar.');
      return;
    }

    if (!Number.isFinite(Number(editPrice)) || Number(editPrice) <= 0) {
      setEditError('Price 0 ru adhika heba darkar.');
      return;
    }

    if (editFiles.length > 5) {
      setEditError('Maximum 5 images upload karipariba.');
      return;
    }

    setEditSaving(true);

    try {
      const formData = new FormData();
      formData.append('name', editName.trim());
      formData.append('description', editDescription.trim());
      formData.append('ingredients', JSON.stringify(ingredients));
      formData.append('price', editPrice);
      formData.append('offer', editOffer.trim());

      editFiles.forEach((file) => formData.append('images', file));

      const response = await fetch(
        `/api/menu-items/${encodeURIComponent(item._id)}`,
        {
          method: 'PUT',
          credentials: 'include',
          body: formData,
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success || !result.item) {
        throw new Error(result.message || 'Unable to update the menu item.');
      }

      setItem(result.item);
      setActiveImage(0);
      setEditOpen(false);
      setEditFiles([]);
    } catch (err) {
      setEditError(err.message || 'Unable to update the menu item.');
    } finally {
      setEditSaving(false);
    }
  };

  const images = Array.isArray(item?.images)
    ? item.images.filter((image) => image?.url)
    : [];


  const handleDeleteItem = async () => {
    if (!item?._id || deletingItem) return;

    setDeletingItem(true);
    setDeleteError('');

    try {
      const response = await fetch(
        `/api/menu-items/${encodeURIComponent(item._id)}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Unable to delete the menu item.');
      }

      router.push('/admin/dashboard/menu-items');
    } catch (error) {
      setDeleteError(error.message || 'Unable to delete the menu item.');
      setDeletingItem(false);
    }
  };

  return (
    <Layout>
      <main className="min-h-full bg-[#F8FBF7]">
        <div className="mx-auto w-full max-w-[1600px] space-y-6 p-4 sm:p-6">
          {isPublic && (
            <button
              type="button"
              onClick={async () => {
                if (!isPublic) {
                  router.push(backHref);
                  return;
                }

                try {
                  const response = await fetch("/api/auth/session", {
                    credentials: "include",
                    cache: "no-store",
                  });
                  const session = await response.json();

                  if (
                    response.ok &&
                    session?.success === true &&
                    session?.authenticated === true &&
                    session?.role === "user" &&
                    session?.userId
                  ) {
                    router.push(`/u/${session.userId}/dashboard/menu-items`);
                  } else {
                    router.push("/");
                  }
                } catch {
                  router.push("/");
                }
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-green-200 bg-white px-4 py-2.5 font-semibold text-green-800 transition hover:bg-green-50"
            >
              <span aria-hidden="true">←</span>
              Back to menu
            </button>
          )}

          {loading ? (
            <div
              className="rounded-2xl bg-white p-10 text-center text-gray-600 shadow-sm"
              role="status"
            >
              Loading menu item...
            </div>
          ) : error ? (
            <section className="rounded-2xl bg-white p-8 text-center shadow-sm">
              <h1 className="text-xl font-bold text-red-700">
                Unable to load item
              </h1>
              <p className="mt-2 text-sm text-gray-600">{error}</p>
              <button
                type="button"
                onClick={loadItem}
                className="mt-5 rounded-xl bg-green-700 px-5 py-3 font-semibold text-white hover:bg-green-800"
              >
                Try again
              </button>
            </section>
          ) : item ? (
            <>
            <article className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-gray-100">
              <div className={`grid gap-6 p-3 sm:p-5 lg:grid-cols-2 lg:gap-8 ${isPublic ? 'items-start' : ''}`}>
                <section>
                  <div className={`relative w-full overflow-hidden rounded-2xl bg-gray-100 ${isPublic ? 'h-70 sm:h-90 lg:h-[min(65vh,560px)]' : 'aspect-square'}`}>
                    <Image
                      src={images[activeImage]?.url || '/default-menu-item.png'}
                      alt={`${item.name} image ${activeImage + 1}`}
                      fill
                      unoptimized
                      priority
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      className={isPublic ? 'object-contain' : 'object-contain'}
                    />

                    {item.offer && (
                      <span className="absolute left-4 top-4 z-10 rounded-full bg-green-700 px-4 py-2 text-sm font-bold text-white shadow">
                        {item.offer}
                      </span>
                    )}

                    {images.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            setActiveImage((current) =>
                              current === 0 ? images.length - 1 : current - 1
                            )
                          }
                          aria-label="Previous image"
                          className="absolute left-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-3xl text-white shadow-lg transition hover:bg-black/75 focus:outline-none focus:ring-2 focus:ring-white"
                        >
                          ‹
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setActiveImage((current) =>
                              current === images.length - 1 ? 0 : current + 1
                            )
                          }
                          aria-label="Next image"
                          className="absolute right-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-3xl text-white shadow-lg transition hover:bg-black/75 focus:outline-none focus:ring-2 focus:ring-white"
                        >
                          ›
                        </button>

                        <span className="absolute bottom-4 right-4 z-10 rounded-full bg-black/60 px-3 py-1 text-sm font-semibold text-white">
                          {activeImage + 1} / {images.length}
                        </span>
                      </>
                    )}
                  </div>

                  {images.length > 1 && (
                    <div
                      className="mt-4 flex items-center justify-center gap-2"
                      aria-label="Choose product image"
                    >
                      {images.map((image, index) => (
                        <button
                          key={image.publicId || image.url}
                          type="button"
                          onClick={() => setActiveImage(index)}
                          aria-label={`Go to image ${index + 1}`}
                          aria-current={activeImage === index ? 'true' : undefined}
                          className={`h-2.5! min-h-0! min-w-0! rounded-full p-0 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 ${activeImage === index
                              ? 'w-7! bg-green-700'
                              : 'w-2.5! bg-gray-300 hover:bg-green-400'
                            }`}
                        />
                      ))}
                    </div>
                  )}
                </section>

                <section className="flex flex-col">
                  <p className="text-sm font-bold uppercase tracking-widest text-green-700">
                    Fresh choice
                  </p>

                  <h1 className="mt-2 mb-6 wrap-break-word text-3xl font-extrabold capitalize tracking-tight text-[#174B35] sm:text-4xl">
                    {item.name}
                  </h1>

                  <p className="mt-2 whitespace-pre-line leading-7 text-gray-600">
                    {item.description}
                  </p>

                  <div className="mt-7">
                    <h2 className="text-lg font-bold text-gray-900">
                      Ingredients
                    </h2>

                    {Array.isArray(item.ingredients) &&
                      item.ingredients.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.ingredients.map((ingredient, index) => (
                          <span
                            key={`${ingredient}-${index}`}
                            className="rounded-full bg-green-50 px-3 py-2 text-sm font-medium text-green-800 ring-1 ring-green-100"
                          >
                            {String(ingredient)
                              .toLowerCase()
                              .replace(/\b\p{L}/gu, (char) => char.toUpperCase())}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-gray-500">
                        No ingredients listed.
                      </p>
                    )}
                  </div>

                  <p className="w-full text-3xl font-extrabold text-green-800 mt-4">
                    ₹{Number(item.price).toFixed(2)}
                  </p>

                  {item.offer && (
                    <div className="mt-4">
                      <span className="rounded-full bg-green-50 px-3 py-1 text-sm font-semibold text-green-800">
                        Offer: {item.offer}
                      </span>
                    </div>
                  )}

                  <div
                    className="mt-4 flex items-center gap-2"
                    aria-label={`Rating ${Number(isPublic ? averageRating : (item.rating ?? 0))} out of 5`}
                  >
                    <span className="text-xl text-amber-500" aria-hidden="true">
                      ★
                    </span>
                    <span className="font-bold text-gray-800">
                      {Number(isPublic ? averageRating : (item.rating ?? 0)).toFixed(1)} / 5
                    </span>
                    <span className="text-sm text-gray-500">Rating</span>
                  </div>
                  <div className="my-6 border-t border-gray-100" />

                  {isPublic && (
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={handleReviewClick}
                        className="rounded-xl bg-green-700 px-5 py-3 font-semibold text-white transition hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2"
                      >
                        Write a Review
                      </button>
                    </div>
                  )}

                  {isAdmin && (
                    <div className="mt-4 flex flex-wrap gap-3 border-t border-gray-100 pt-6">
                      <button
                        type="button"
                        onClick={openEditModal}
                        className="rounded-xl bg-green-700 px-5 py-3 font-semibold text-white hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2"
                      >
                        Edit item
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteError('');
                          setDeleteConfirmOpen(true);
                        }}
                        disabled={deletingItem}
                        className="rounded-xl border border-red-200 bg-white px-5 py-3 font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                      >
                        Delete item
                      </button>
                    </div>
                  )}
                </section>
              </div>
            </article>
                  {(isPublic || isAdmin) && (
                    <section className="mt-6 rounded-2xl border border-green-100 bg-white p-5 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h2 className="text-xl font-bold text-gray-900">Customer Reviews</h2>
                          <p className="mt-1 text-sm text-gray-600">
                            <span className="font-semibold text-amber-600">★ {averageRating.toFixed(1)} / 5</span>
                            <span className="ml-2">({reviewCount} {reviewCount === 1 ? "review" : "reviews"})</span>
                          </p>
                        </div>
                      </div>

                      {reviewError && !reviewModalOpen && (
                        <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{reviewError}</p>
                      )}
                      {reviewSuccess && (
                        <p role="status" className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">{reviewSuccess}</p>
                      )}

                      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {reviews.length === 0 ? (
                          <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600">No reviews yet. Be the first to review this item.</p>
                        ) : reviews.map((review) => {
                          const stars = Math.max(0, Math.min(5, Number(review.rating) || 0));
                          return (
                            <article
                              key={review._id}
                              className="h-full min-w-0 rounded-xl border border-green-100 bg-white p-4 transition duration-200 hover:border-green-300 hover:shadow-md"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex min-w-0 items-center gap-3">
                                  <Image
                                    src="/default-profile.svg"
                                    alt=""
                                    aria-hidden="true"
                                    width={40}
                                    height={40}
                                    className="h-10 w-10 shrink-0 rounded-full border border-green-100 bg-green-50 object-cover"
                                  />
                                  <p className="min-w-0 wrap-break-word font-semibold text-gray-900">
                                    {review.username || "Customer"}
                                  </p>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                  <div className="flex shrink-0 flex-col items-end gap-1">
                                    <time
                                      className="text-xs text-gray-500"
                                      dateTime={review.createdAt || undefined}
                                    >
                                      {review.createdAt && !Number.isNaN(new Date(review.createdAt).getTime())
                                        ? new Date(review.createdAt).toLocaleDateString("en-GB", {
                                            day: "2-digit",
                                            month: "2-digit",
                                            year: "numeric",
                                            timeZone: "Asia/Kolkata",
                                          })
                                        : ""}
                                    </time>
                                    {review.createdAt && !Number.isNaN(new Date(review.createdAt).getTime()) && (
                                      <span className="text-[11px] text-gray-400">
                                        {(() => {
                                          const elapsed = Math.max(
                                            0,
                                            Date.now() - new Date(review.createdAt).getTime()
                                          );
                                          const minutes = Math.floor(elapsed / 60000);
                                          const hours = Math.floor(elapsed / 3600000);
                                          const days = Math.floor(elapsed / 86400000);

                                          if (minutes < 1) return "Just now";
                                          if (minutes < 60) return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
                                          if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
                                          if (days < 30) return `${days} ${days === 1 ? "day" : "days"} ago`;
                                          const months = Math.floor(days / 30);
                                          if (months < 12) return `${months} ${months === 1 ? "month" : "months"} ago`;
                                          const years = Math.floor(days / 365);
                                          return `${years} ${years === 1 ? "year" : "years"} ago`;
                                        })()}
                                      </span>
                                    )}
                                  </div>

                                </div>
                              </div>
                              <p className="mt-1 text-amber-500" aria-label={`${stars} out of 5 stars`}>
                                {"★".repeat(stars)}{"☆".repeat(5 - stars)}
                              </p>
                              <p className="mt-2 whitespace-pre-wrap wrap-break-word text-sm leading-6 text-gray-700">{review.message}</p>
                              {(isAdmin || (
                                isPublic &&
                                sessionRole === 'user' &&
                                sessionUserId &&
                                String(review.userId || '') === sessionUserId
                              )) && (
                                <div className="mt-3 flex justify-end">
                                  <button
                                    type="button"
                                    aria-label={`Delete review by ${review.username || 'Customer'}`}
                                    title="Delete review"
                                    disabled={deletingReview}
                                    onClick={() => {
                                      setReviewToDelete(review);
                                      setReviewDeleteError('');
                                      setReviewDeleteConfirmOpen(true);
                                    }}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="1.8"
                                      className="h-4 w-4"
                                      aria-hidden="true"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M8 6V4h8v2m-10 0 1 14h10l1-14M10 10v6m4-6v6" />
                                    </svg>
                                  </button>
                                </div>
                              )}
                            </article>
                          );
                        })}
                      </div>
                    </section>
                  )}
            </>
          ) : null}
        </div>
      </main>

      {editOpen && item && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget && !editSaving) {
              setEditOpen(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-menu-item-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto scrollbar-none [&::-webkit-scrollbar]:hidden rounded-2xl bg-white p-5 shadow-2xl sm:p-7"
          >
            <div className="mb-6 flex items-center justify-between gap-4">
              <h2 id="edit-menu-item-title" className="text-2xl font-bold text-[#174B35]">
                Edit Menu Item
              </h2>
              <button
                type="button"
                aria-label="Close edit form"
                disabled={editSaving}
                onClick={() => setEditOpen(false)}
                className="rounded-lg px-3 py-2 text-2xl text-gray-500 hover:bg-gray-100 disabled:opacity-50"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label htmlFor="edit-item-name" className="mb-1 block text-sm font-semibold text-gray-700">
                  Item name
                </label>
                <input
                  id="edit-item-name"
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  maxLength={120}
                  required
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
                />
              </div>

              <div>
                <label htmlFor="edit-item-description" className="mb-1 block text-sm font-semibold text-gray-700">
                  Description
                </label>
                <textarea
                  id="edit-item-description"
                  value={editDescription}
                  onChange={(event) => setEditDescription(event.target.value)}
                  maxLength={500}
                  rows={3}
                  required
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
                />
              </div>

              <div>
                <label htmlFor="ingredient-mode" className="mb-1 block text-sm font-semibold text-gray-700">
                  Ingredient action
                </label>
                <select
                  id="ingredient-mode"
                  value={ingredientMode}
                  onChange={(event) => {
                    setIngredientMode(event.target.value);
                    setReplaceIngredientIndex('');
                    setIngredientInput('');
                    setEditError('');
                  }}
                  className="mb-3 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
                >
                  <option value="new">New — add an ingredient</option>
                  {editIngredients.some((_, index) => !replacedIngredientIndexes.includes(index)) && (
                    <option value="replace">Replace — change an existing ingredient once</option>
                  )}
                </select>

                {ingredientMode === 'replace' && (
                  <div className="mb-3">
                    <label htmlFor="replace-ingredient" className="mb-1 block text-sm font-medium text-gray-700">
                      Choose ingredient to replace
                    </label>
                    <select
                      id="replace-ingredient"
                      value={replaceIngredientIndex}
                      onChange={(event) => setReplaceIngredientIndex(event.target.value)}
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
                    >
                      <option value="">Select an ingredient</option>
                      {editIngredients.map((ingredient, index) => (
                        !replacedIngredientIndexes.includes(index) && (
                          <option key={`${ingredient}-${index}`} value={String(index)}>
                            {ingredient}
                          </option>
                        )
                      ))}
                    </select>
                  </div>
                )}

                <label htmlFor="ingredient-value" className="mb-1 block text-sm font-semibold text-gray-700">
                  {ingredientMode === 'new' ? 'New ingredient' : 'Replacement value'}
                </label>
                <div className="flex gap-2">
                  <input
                    id="ingredient-value"
                    value={ingredientInput}
                    onChange={(event) => setIngredientInput(event.target.value)}
                    maxLength={100}
                    placeholder={ingredientMode === 'new' ? 'Enter ingredient name' : 'Enter replacement name'}
                    className="min-w-0 flex-1 rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const value = ingredientInput.trim();
                      if (!value) {
                        setEditError('Ingredient name enter kara.');
                        return;
                      }

                      if (editIngredients.some((ingredient, index) =>
                        ingredient.toLowerCase() === value.toLowerCase() &&
                        (ingredientMode !== 'replace' || index !== Number(replaceIngredientIndex))
                      )) {
                        setEditError('Ehi ingredient already list re achhi.');
                        return;
                      }

                      if (ingredientMode === 'new') {
                        setEditIngredients((current) => [...current, value]);
                      } else {
                        const index = Number(replaceIngredientIndex);
                        if (
                          replaceIngredientIndex === '' ||
                          !Number.isInteger(index) ||
                          !editIngredients[index] ||
                          replacedIngredientIndexes.includes(index)
                        ) {
                          setEditError('Select an available ingredient to replace it.');
                          return;
                        }

                        setEditIngredients((current) =>
                          current.map((ingredient, currentIndex) =>
                            currentIndex === index ? value : ingredient
                          )
                        );
                        setReplacedIngredientIndexes((current) => [...current, index]);
                        setReplaceIngredientIndex('');
                      }

                      setIngredientInput('');
                      setEditError('');
                    }}
                    className="shrink-0 rounded-xl bg-green-700 px-4 py-3 font-semibold text-white hover:bg-green-800"
                  >
                    Add
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {editIngredients.map((ingredient, index) => (
                    <span
                      key={`${index}-${ingredient}`}
                      className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-2 text-sm font-medium text-green-800 ring-1 ring-green-100"
                    >
                      {String(ingredient)
                        .toLowerCase()
                        .replace(/\b\p{L}/gu, (char) => char.toUpperCase())}
                      {replacedIngredientIndexes.includes(index) && (
                        <span className="text-xs text-green-600">Replaced</span>
                      )}
                      <button
                        type="button"
                        aria-label={`Remove ${ingredient}`}
                        title={`Remove ${ingredient}`}
                        onClick={() => {
                          setEditIngredients((current) =>
                            current.filter((_, currentIndex) => currentIndex !== index)
                          );
                          setReplacedIngredientIndexes((current) =>
                            current
                              .filter((replacedIndex) => replacedIndex !== index)
                              .map((replacedIndex) =>
                                replacedIndex > index ? replacedIndex - 1 : replacedIndex
                              )
                          );
                          if (replaceIngredientIndex !== '') {
                            const selectedIndex = Number(replaceIngredientIndex);
                            if (selectedIndex === index) {
                              setReplaceIngredientIndex('');
                            } else if (selectedIndex > index) {
                              setReplaceIngredientIndex(String(selectedIndex - 1));
                            }
                          }
                          setEditError('');
                        }}
                        className="flex h-5 w-5 items-center justify-center rounded-full text-green-700 hover:bg-red-100 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-400"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  New adds a badge. Replace changes an ingredient once per edit session.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="edit-item-price" className="mb-1 block text-sm font-semibold text-gray-700">
                    Price (₹)
                  </label>
                  <input
                    id="edit-item-price"
                    type="number"
                    min="0.01"
                    step="0.01"
                    onWheel={(event) => event.currentTarget.blur()}
                    value={editPrice}
                    onChange={(event) => setEditPrice(event.target.value)}
                    required
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
                  />
                </div>

                <div>
                  <label htmlFor="edit-item-offer" className="mb-1 block text-sm font-semibold text-gray-700">
                    Offer (optional)
                  </label>
                  <input
                    id="edit-item-offer"
                    value={editOffer}
                    onChange={(event) => setEditOffer(event.target.value)}
                    maxLength={100}
                    placeholder="e.g. 10% off"
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="edit-item-images" className="mb-1 block text-sm font-semibold text-gray-700">
                  Replace images (optional)
                </label>
                <input
                  id="edit-item-images"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  multiple
                  onChange={(event) => setEditFiles(Array.from(event.target.files || []))}
                  className="block w-full rounded-xl border border-gray-300 p-3 text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Image select na kale existing images rahiba. New images select kale gallery replace heba; maximum 5 images, 5 MB each.
                </p>
                {editFiles.length > 0 && (
                  <p className="mt-1 text-sm text-green-800">
                    {editFiles.length} image(s) selected.
                  </p>
                )}
              </div>

              {editError && (
                <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {editError}
                </p>
              )}

              <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-5">
                <button
                  type="button"
                  disabled={editSaving}
                  onClick={() => setEditOpen(false)}
                  className="rounded-xl border border-gray-300 px-5 py-3 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="rounded-xl bg-green-700 px-5 py-3 font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {editSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      <Warning
        open={deleteConfirmOpen}
        title="Delete menu item?"
        message={
          deleteError
            ? deleteError
            : `Are you sure you want to permanently delete "${item?.name || 'this menu item'}"? This action cannot be undone.`
        }
        confirmText="Delete item"
        cancelText="Cancel"
        onConfirm={handleDeleteItem}
        onCancel={() => {
          if (!deletingItem) {
            setDeleteConfirmOpen(false);
            setDeleteError('');
          }
        }}
        loading={deletingItem}
      />

      <Warning
        open={reviewDeleteConfirmOpen}
        title="Delete review?"
        message={
          reviewDeleteError ||
          `Are you sure you want to delete this review${reviewToDelete?.username ? ` by ${reviewToDelete.username}` : ''}? This action cannot be undone.`
        }
        confirmText="Delete review"
        cancelText="Cancel"
        onConfirm={handleDeleteReview}
        onCancel={() => {
          if (!deletingReview) {
            setReviewDeleteConfirmOpen(false);
            setReviewToDelete(null);
            setReviewDeleteError('');
          }
        }}
        loading={deletingReview}
      />

      {isPublic && reviewModalOpen && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !reviewSubmitting) {
              setReviewModalOpen(false);
              setReviewError('');
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Review dialog"
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl transition duration-200"
          >
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Write a Review</h2>
                <p className="mt-1 text-sm text-gray-500">Share your experience with this item.</p>
              </div>
              <button
                type="button"
                aria-label="Close review dialog"
                disabled={reviewSubmitting}
                onClick={() => {
                  setReviewModalOpen(false);
                  setReviewError('');
                }}
                className="rounded-lg px-3 py-2 text-xl text-gray-500 hover:bg-gray-100 disabled:opacity-50"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleReviewSubmit} className="space-y-5">
              <fieldset>
                <legend className="mb-2 text-sm font-semibold text-gray-800">
                  Your rating <span className="text-red-600">*</span>
                </legend>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      disabled={reviewSubmitting}
                      aria-label={`${star} star${star === 1 ? '' : 's'}`}
                      aria-pressed={reviewRating === star}
                      onClick={() => setReviewRating(star)}
                      className="rounded-md p-1 text-3xl transition hover:scale-110 disabled:opacity-50"
                    >
                      <span className={star <= reviewRating ? 'text-amber-400' : 'text-gray-300'}>
                        ★
                      </span>
                    </button>
                  ))}
                  <span className="ml-2 text-sm text-gray-600">{reviewRating} / 5</span>
                </div>
              </fieldset>

              <div>
                <label htmlFor="menu-item-review-message" className="mb-2 block text-sm font-semibold text-gray-800">
                  Your review <span className="text-red-600">*</span>
                </label>
                <textarea
                  id="menu-item-review-message"
                  name="message"
                  required
                  minLength={2}
                  maxLength={300}
                  rows={4}
                  value={reviewMessage}
                  disabled={reviewSubmitting}
                  onChange={(event) => setReviewMessage(event.target.value)}
                  placeholder="What did you think about this item?"
                  className="w-full resize-y rounded-xl border border-gray-300 p-3 text-sm outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100 disabled:bg-gray-100"
                />
                <p className="mt-1 text-right text-xs text-gray-500">{reviewMessage.length}/300</p>
              </div>

              {reviewError && (
                <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {reviewError}
                </p>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  disabled={reviewSubmitting}
                  onClick={() => {
                    setReviewModalOpen(false);
                    setReviewError('');
                  }}
                  className="rounded-xl border border-gray-300 px-4 py-2.5 font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewSubmitting || reviewMessage.trim().length < 2}
                  className="rounded-xl bg-green-700 px-5 py-2.5 font-semibold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

    </Layout>
  );
}