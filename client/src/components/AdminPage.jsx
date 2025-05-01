import React, { useState, useEffect, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../context/AuthContext';

function AdminPage() {
  const { t } = useTranslation();
  const { user } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [sort, setSort] = useState({ field: 'name', order: 'asc' });

  useEffect(() => {
    if (user?.is_admin) {
      fetch('/api/users', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })
        .then(res => res.json())
        .then(data => setUsers(data))
        .catch(err => console.error('Fetch users error:', err));
    }
  }, [user]);

  const handleSort = (field) => {
    setSort({
      field,
      order: sort.field === field && sort.order === 'asc' ? 'desc' : 'asc',
    });
  };

  const sortedUsers = [...users].sort((a, b) => {
    const valA = a[sort.field] || '';
    const valB = b[sort.field] || '';
    return sort.order === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
  });

  const handleBlock = async (id) => {
    const response = await fetch(`/api/users/${id}/block`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    if (response.ok) {
      setUsers(users.map(u => (u.id === id ? { ...u, status: 'blocked' } : u)));
    } else {
      console.error('Block user error:', await response.json());
    }
  };

  const handleUnblock = async (id) => {
    const response = await fetch(`/api/users/${id}/unblock`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    if (response.ok) {
      setUsers(users.map(u => (u.id === id ? { ...u, status: 'active' } : u)));
    } else {
      console.error('Unblock user error:', await response.json());
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm(t('admin.confirm_delete'))) {
      const response = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (response.ok) {
        setUsers(users.filter(u => u.id !== id));
      } else {
        console.error('Delete user error:', await response.json());
      }
    }
  };

  const handleToggleAdmin = async (id, is_admin) => {
    const response = await fetch(`/api/users/${id}/admin`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({ is_admin }),
    });
    if (response.ok) {
      setUsers(users.map(u => (u.id === id ? { ...u, is_admin } : u)));
    } else {
      console.error('Toggle admin error:', await response.json());
    }
  };

  if (!user?.is_admin) return <div className="container mx-auto p-4">{t('admin.forbidden')}</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">{t('admin.title')}</h1>
      <table className="w-full border">
        <thead>
          <tr>
            <th
              onClick={() => handleSort('name')}
              className="cursor-pointer"
            >
              {t('admin.name')} {sort.field === 'name' && (sort.order === 'asc' ? '↑' : '↓')}
            </th>
            <th
              onClick={() => handleSort('email')}
              className="cursor-pointer"
            >
              {t('admin.email')} {sort.field === 'email' && (sort.order === 'asc' ? '↑' : '↓')}
            </th>
            <th
              onClick={() => handleSort('status')}
              className="cursor-pointer"
            >
              {t('admin.status')} {sort.field === 'status' && (sort.order === 'asc' ? '↑' : '↓')}
            </th>
            <th
              onClick={() => handleSort('is_admin')}
              className="cursor-pointer"
            >
              {t('admin.admin')} {sort.field === 'is_admin' && (sort.order === 'asc' ? '↑' : '↓')}
            </th>
            <th>{t('admin.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {sortedUsers.map(u => (
            <tr key={u.id}>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>{t(`admin.status_${u.status}`)}</td>
              <td>{u.is_admin ? t('yes') : t('no')}</td>
              <td>
                {u.id !== user.id && (
                  <>
                    {u.status === 'active' ? (
                      <button
                        onClick={() => handleBlock(u.id)}
                        className="text-red-500 hover:underline mr-2"
                      >
                        {t('admin.block')}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUnblock(u.id)}
                        className="text-green-500 hover:underline mr-2"
                      >
                        {t('admin.unblock')}
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(u.id)}
                      className="text-red-500 hover:underline mr-2"
                    >
                      {t('admin.delete')}
                    </button>
                    <button
                      onClick={() => handleToggleAdmin(u.id, !u.is_admin)}
                      className="text-blue-500 hover:underline"
                    >
                      {u.is_admin ? t('admin.remove_admin') : t('admin.make_admin')}
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AdminPage;