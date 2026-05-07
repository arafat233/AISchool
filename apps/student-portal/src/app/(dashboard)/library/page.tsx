"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import {
  Library,
  BookMarked,
  Tablet,
  AlertTriangle,
  Loader2,
  RefreshCw,
  ExternalLink,
  Clock,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/auth.store";

interface IssuedBook {
  id: string;
  bookTitle: string;
  author: string;
  isbn: string;
  issuedOn: string;
  dueDate: string;
  renewCount: number;
  maxRenews: number;
}

interface Ebook {
  id: string;
  title: string;
  author: string;
  subject: string;
  coverUrl?: string;
  fileUrl: string;
}

type ViewTab = "issued" | "ebooks";

export default function LibraryPage() {
  const user = useAuthStore((s) => s.user);
  const studentId = user?.id ?? "";
  const schoolId = user?.schoolId ?? "";
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<ViewTab>("issued");

  const { data: issued = [], isLoading: issuedLoading, isError: issuedError } = useQuery<IssuedBook[]>({
    queryKey: ["library-issues", studentId],
    queryFn: () =>
      api.get(`/library/members/${studentId}/issues`, { params: { role: "STUDENT" } }).then((r) => r.data),
    enabled: !!studentId,
    placeholderData: [
      {
        id: "i1",
        bookTitle: "Introduction to Algorithms",
        author: "Cormen, Leiserson, Rivest",
        isbn: "978-0-262-03384-8",
        issuedOn: "2026-04-20",
        dueDate: "2026-05-10",
        renewCount: 0,
        maxRenews: 2,
      },
      {
        id: "i2",
        bookTitle: "Organic Chemistry",
        author: "Paula Y. Bruice",
        isbn: "978-0-134-07541-5",
        issuedOn: "2026-04-25",
        dueDate: "2026-05-15",
        renewCount: 1,
        maxRenews: 2,
      },
      {
        id: "i3",
        bookTitle: "A Brief History of Time",
        author: "Stephen Hawking",
        isbn: "978-0-553-38016-3",
        issuedOn: "2026-04-01",
        dueDate: "2026-04-30",
        renewCount: 2,
        maxRenews: 2,
      },
    ],
  });

  const { data: ebooks = [], isLoading: ebooksLoading } = useQuery<Ebook[]>({
    queryKey: ["library-ebooks", schoolId],
    queryFn: () => api.get(`/library/${schoolId}/ebooks`).then((r) => r.data),
    enabled: !!schoolId && tab === "ebooks",
    placeholderData: [
      { id: "e1", title: "Calculus Made Easy",     author: "Silvanus Thompson", subject: "Mathematics", fileUrl: "#" },
      { id: "e2", title: "Feynman Lectures Vol. 1", author: "Richard Feynman",   subject: "Physics",     fileUrl: "#" },
      { id: "e3", title: "The Republic",            author: "Plato",              subject: "Philosophy",  fileUrl: "#" },
      { id: "e4", title: "1984",                    author: "George Orwell",      subject: "English",     fileUrl: "#" },
    ],
  });

  const renewBook = useMutation({
    mutationFn: (issueId: string) =>
      api.post(`/library/issues/${issueId}/renew`).then((r) => r.data),
    onSuccess: () => {
      toast.success("Book renewed successfully");
      queryClient.invalidateQueries({ queryKey: ["library-issues", studentId] });
    },
    onError: () => toast.error("Renewal failed"),
  });

  const isLoading = issuedLoading || (tab === "ebooks" && ebooksLoading);

  function isOverdue(dueDate: string) {
    return new Date(dueDate) < new Date();
  }

  function daysUntilDue(dueDate: string) {
    const diff = Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff;
  }

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="bg-card rounded-xl border border-border grid grid-cols-3 divide-x divide-border">
        <div className="p-5 flex items-start gap-3">
          <BookMarked className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground font-medium">Books Issued</p>
            <p className="text-xl font-bold tabular-nums text-foreground mt-0.5">{issued.length}</p>
          </div>
        </div>
        <div className="p-5 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground font-medium">Overdue</p>
            <p className="text-xl font-bold tabular-nums text-foreground mt-0.5">
              {issued.filter((i) => isOverdue(i.dueDate)).length}
            </p>
          </div>
        </div>
        <div className="p-5 flex items-start gap-3">
          <Tablet className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground font-medium">E-Books Available</p>
            <p className="text-xl font-bold tabular-nums text-foreground mt-0.5">{ebooks.length || "—"}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {([
          { key: "issued", label: "Issued Books" },
          { key: "ebooks", label: "E-Books" },
        ] as { key: ViewTab; label: string }[]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "relative px-4 py-2.5 text-sm font-medium transition focus-visible:outline-none after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:transition-colors",
              tab === key
                ? "text-foreground after:bg-primary"
                : "text-muted-foreground hover:text-foreground after:bg-transparent"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Issued books */}
      {!isLoading && tab === "issued" && (
        <>
          {issuedError ? (
            <div className="bg-card rounded-xl border border-border py-16 flex flex-col items-center text-muted-foreground gap-3">
              <AlertTriangle className="w-7 h-7 opacity-40" />
              <p className="text-sm">Failed to load issued books</p>
            </div>
          ) : issued.length === 0 ? (
            <div className="bg-card rounded-xl border border-border py-20 flex flex-col items-center text-muted-foreground gap-3">
              <Library className="w-8 h-8 opacity-20" />
              <p className="text-sm">No books currently issued</p>
            </div>
          ) : (
            <div className="space-y-3">
              {issued.map((book) => {
                const overdue = isOverdue(book.dueDate);
                const days = daysUntilDue(book.dueDate);
                const canRenew = book.renewCount < book.maxRenews && !overdue;

                return (
                  <div
                    key={book.id}
                    className={cn(
                      "bg-card rounded-xl border overflow-hidden px-5 py-4 flex items-start justify-between gap-4",
                      overdue ? "border-red-500/30" : "border-border"
                    )}
                  >
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground">{book.bookTitle}</span>
                        {overdue && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-md border text-red-700 dark:text-red-400 bg-red-500/10 border-red-500/20">
                            Overdue
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{book.author}</p>
                      <p className="text-xs text-muted-foreground font-mono">{book.isbn}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground pt-0.5">
                        <span className="flex items-center gap-1">
                          <BookMarked className="w-3 h-3" />
                          Issued {formatDate(book.issuedOn)}
                        </span>
                        <span className={cn("flex items-center gap-1", overdue ? "text-red-500" : days <= 3 ? "text-amber-500" : "")}>
                          <Clock className="w-3 h-3" />
                          Due {formatDate(book.dueDate)}
                          {!overdue && ` (${days}d left)`}
                          {overdue && " — Return immediately"}
                        </span>
                      </div>
                      {book.renewCount > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Renewed {book.renewCount}/{book.maxRenews} times
                        </p>
                      )}
                    </div>
                    <div className="shrink-0">
                      {canRenew ? (
                        <button
                          onClick={() => renewBook.mutate(book.id)}
                          disabled={renewBook.isPending}
                          className="btn-secondary flex items-center gap-2 text-xs disabled:opacity-50"
                        >
                          {renewBook.isPending ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3.5 h-3.5" />
                          )}
                          Renew
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {book.renewCount >= book.maxRenews ? "Max renews reached" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* E-Books */}
      {!isLoading && tab === "ebooks" && (
        <>
          {ebooks.length === 0 ? (
            <div className="bg-card rounded-xl border border-border py-20 flex flex-col items-center text-muted-foreground gap-3">
              <Tablet className="w-8 h-8 opacity-20" />
              <p className="text-sm">No e-books available</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ebooks.map((eb) => (
                <div key={eb.id} className="bg-card rounded-xl border border-border p-4 flex items-start gap-3">
                  <div className="w-10 h-14 bg-primary/10 rounded-md flex items-center justify-center shrink-0">
                    <Tablet className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="font-semibold text-foreground text-sm truncate">{eb.title}</p>
                    <p className="text-xs text-muted-foreground">{eb.author}</p>
                    <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md inline-block">
                      {eb.subject}
                    </span>
                  </div>
                  <a
                    href={eb.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary flex items-center gap-1.5 text-xs shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Read
                  </a>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
