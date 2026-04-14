export const notificationsMock = [
  {
    id: '1',
    type: 'follow',
    user: {
      name: 'Maria',
      avatar: '/avatars/1.png',
      gender: 'female',
    },
    isRead: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    type: 'like',
    user: {
      name: 'Maria',
      avatar: '/avatars/1.png',
      gender: 'female',
    },
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
  },
  {
    id: '3',
    type: 'comment',
    comment: 'Дуже красиво!',
    user: {
      name: 'Maria',
      avatar: '/avatars/1.png',
      gender: 'female',
    },
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  },
  {
    id: '4',
    type: 'follow',
    user: {
      name: 'Nick',
      avatar: '/avatars/2.png',
      gender: 'male',
    },
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: '5',
    type: 'follow',
    user: {
      name: 'Lesia',
      avatar: '/avatars/3.png',
      gender: 'female',
    },
    isRead: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: '6',
    type: 'like',
    user: {
      name: 'Lesia',
      avatar: '/avatars/3.png',
      gender: 'female',
    },
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
  },
  {
    id: '7',
    type: 'comment',
    comment: 'vayy!',
    user: {
      name: 'Lesia',
      avatar: '/avatars/3.png',
      gender: 'female',
    },
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  },
  {
    id: '8',
    type: 'follow',
    user: {
      name: 'Ola',
      avatar: '/avatars/4.png',
      gender: 'female',
    },
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: '9',
    type: 'comment',
    comment: 'Supper!',
    user: {
      name: 'Ola',
      avatar: '/avatars/4.png',
      gender: 'female',
    },
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 9).toISOString(),
  },
];
