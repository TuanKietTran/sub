export default defineNuxtRouteMiddleware((to) => {
  if (to.path.startsWith("/d")) {
    const { user } = useAuth();
    if (!user.value) {
      return navigateTo("/login");
    }
  }
});
