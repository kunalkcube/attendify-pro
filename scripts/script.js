document.addEventListener('DOMContentLoaded', function () {
    const profilePic = document.getElementById('profile-pic');
    const profileMenu = document.getElementById('profile-menu');

    // Show/hide menu on profile picture click
    profilePic.addEventListener('click', function () {
        profileMenu.classList.toggle('hidden');
    });

    // Hide menu on document click (if clicked outside the menu)
    document.addEventListener('click', function (event) {
        if (!profileMenu.contains(event.target) && !profilePic.contains(event.target)) {
            profileMenu.classList.add('hidden');
        }
    });
});