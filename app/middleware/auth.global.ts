export default defineNuxtRouteMiddleware((to) => {
  if (to.meta.public) return;

  if (to.path.startsWith("/d") || to.path.startsWith("/p")) {
    const userId = to.query.userId as string | undefined;
    if (userId === "demo") return;

    const { user } = useAuth();
    if (!user.value) {
      return navigateTo("/login");
    }
  }
});
