(function () {
  "use strict";

  var button = document.getElementById("download-cv-pdf");
  if (!button) {
    return;
  }

  button.addEventListener("click", function () {
    var previousTitle = document.title;
    document.title = "Dr_Suraj_Prasad_CV";

    // Uses the browser's native Save as PDF flow with current webpage data.
    window.print();

    window.setTimeout(function () {
      document.title = previousTitle;
    }, 500);
  });
})();
