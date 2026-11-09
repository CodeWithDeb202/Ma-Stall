'use client';

import { useEffect, useState } from 'react';
import axiosFetch from '@/lib/axios-fetch';
import apiUrl from '@/services/api';
import DashboardLayout from '../layout/DashboardLayout';
import Table from '../reusable/Table';
import Spinner from '../reusable/Spinner';
import { showError, showSuccess } from '@/lib/toast';
import Warning from '../reusable/Warning';
import Form from '../reusable/Form';

function formatRegistrationDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
}

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [notificationTarget, setNotificationTarget] = useState(null);
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');

  useEffect(() => {
    let active = true;

    async function loadUsers() {
      try {
        const response = await axiosFetch(`${apiUrl}/api/admin/users`, {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Could not load users.');
        }

        if (active) setUsers(Array.isArray(result.users) ? result.users : []);
      } catch (error) {
        if (active) showError(error.message || 'Could not load users.');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadUsers();
    return () => { active = false; };
  }, []);

  async function confirmDeleteUser() {
    if (!deleteTarget || deleteLoading) return;

    setDeleteLoading(true);
    try {
      const response = await axiosFetch(
        `${apiUrl}/api/admin/users/${deleteTarget._id}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );

      if (response.status === 401) {
        window.location.replace('/');
        return;
      }

      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Could not delete user.');
      }

      setUsers((previous) => previous.filter((user) => user._id !== deleteTarget._id));
      setDeleteTarget(null);
      showSuccess('User permanently deleted.');
    } catch (error) {
      showError(error.message || 'Could not delete user.');
    } finally {
      setDeleteLoading(false);
    }
  }

  const columns = [
    {
      key: 'serial',
      label: 'Sl. No.',
      render: (_user, index) => index + 1,
    },
    {
      key: 'name',
      label: 'Name',
      render: (user) => (
        <div className="flex min-w-0 flex-col gap-1">
          <span className="font-semibold text-[#174D35]">
            {(user.name?.trim() || user.username || 'Unnamed user').charAt(0).toUpperCase() + (user.name?.trim() || user.username || 'Unnamed user').slice(1)}
          </span>
          <span className="text-xs text-[#718477]">
            {formatRegistrationDate(user.createdAt)}
          </span>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <section className="space-y-6 p-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#52715D]">
              User Management
            </p>
            <h1 className="mt-1 text-2xl font-bold text-[#174D35] md:text-3xl">
              All Users
            </h1>
          </div>

          <div className="rounded-xl border border-[#D8E5D8] bg-white px-5 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#52715D]">
              Users Count
            </p>
            <p className="mt-1 text-2xl font-bold text-[#176B45]">
              {users.length}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-48 items-center justify-center">
            <Spinner label="Loading users..." />
          </div>
        ) : (
          <Table
            columns={columns}
            data={users}
            getRowKey={(user) => user._id}
            emptyMessage="No registered users found."
            renderActions={(user) => (
              <div className="flex items-center gap-2">
              <button
                type="button"
                title="Delete User"
                aria-label="Delete User"
                onClick={() => setDeleteTarget(user)}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-600 text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="m19 6-1 14H6L5 6"/><path d="M10 11v5M14 11v5"/></svg>
              </button>
              <button
                type="button"
                title="Send Notification"
                aria-label="Send Notification"
                onClick={() => {
                  setNotificationTarget(user);
                  setNotificationTitle('');
                  setNotificationMessage('');
                }}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#176B45] text-white transition hover:bg-[#125638] focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/>
                  <path d="M10 21h4"/>
                </svg>
              </button>
              </div>
            )}
          />
        )}
      </section>

      {notificationTarget && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="notification-modal-title"
            className="w-full max-w-lg rounded-2xl border border-[#D8E5D8] bg-white p-6 shadow-xl"
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#52715D]">
                  User Notification
                </p>
                <h2 id="notification-modal-title" className="mt-1 text-xl font-bold text-[#174D35]">
                  Send Notification
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  To: {notificationTarget.name?.trim() || notificationTarget.username}
                </p>
              </div>
              <button
                type="button"
                title="Close"
                aria-label="Close notification modal"
                onClick={() => setNotificationTarget(null)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-xl text-gray-500 hover:bg-gray-100"
              >
                ×
              </button>
            </div>

            <Form
              title=""
              fieldsClassName="mt-5 grid grid-cols-1 gap-4"
              fields={[
                {
                  name: 'title',
                  label: 'Title',
                  placeholder: 'Enter notification title',
                  required: true,
                },
                {
                  name: 'message',
                  label: 'Message',
                  type: 'textarea',
                  rows: 5,
                  placeholder: 'Write your message...',
                  required: true,
                },
              ]}
              values={{
                title: notificationTitle,
                message: notificationMessage,
              }}
              onChange={(name, value) => {
                if (name === 'title') setNotificationTitle(value);
                if (name === 'message') setNotificationMessage(value);
              }}
              onSubmit={(event) => event.preventDefault()}
              submitText="Send"
            />
          </div>
        </div>
      )}

      <Warning
        open={Boolean(deleteTarget)}
        title="Delete User Permanently?"
        message={
          deleteTarget
            ? `Are you sure you want to permanently delete "${deleteTarget.name?.trim() || deleteTarget.username || 'this user'}"? This action cannot be undone.`
            : 'Are you sure you want to delete this user?'
        }
        confirmText="Delete User"
        cancelText="Cancel"
        onConfirm={confirmDeleteUser}
        onCancel={() => {
          if (!deleteLoading) setDeleteTarget(null);
        }}
        loading={deleteLoading}
      />
    </DashboardLayout>
  );
}
