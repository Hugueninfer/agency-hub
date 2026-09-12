import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { NotificationContext } from "../context/notification-context";
import NotificationsPage from "./NotificationsPage";

afterEach(cleanup);

it("changes filters at page one without requesting the previous page of the new filter", () => {
  const fetchNotifications = vi.fn();
  render(
    <MemoryRouter>
      <NotificationContext.Provider value={{
        notifications: {
          data: [{ uuid: "notice-1", type: "task_assigned", title: "Assigned task", body: "Review draft", read: false, action_url: null, created_at: "2026-09-01T12:00:00Z" }],
          meta: { current_page: 1, last_page: 3, total: 41, per_page: 20 },
        },
        loading: false,
        unreadCount: 1,
        fetchNotifications,
        markAsRead: vi.fn(),
        markAllAsRead: vi.fn(),
      }}>
        <NotificationsPage />
      </NotificationContext.Provider>
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();
  fetchNotifications.mockClear();

  fireEvent.click(screen.getByRole("button", { name: "Unread" }));

  expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
  expect(fetchNotifications.mock.calls).toEqual([[1, 20, "unread"]]);
});
