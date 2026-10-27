export function authenticateUser(users, username, password) {
  if (!username || !password) {
    return { success: false, message: 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu' };
  }

  const cleanUser = username.trim().toLowerCase();
  const user = users.find(
    (item) =>
      (item.username.toLowerCase() === cleanUser || item.email.toLowerCase() === cleanUser) &&
      String(item.password) === String(password).trim()
  );

  return user
    ? { success: true, user }
    : { success: false, message: 'Tên đăng nhập hoặc mật khẩu không chính xác' };
}

export function findUserById(users, userId) {
  return users.find((user) => user.id === userId) || null;
}
