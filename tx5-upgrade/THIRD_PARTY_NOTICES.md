# Third-party notices

## Eclipse ThreadX

The ThreadX source is included as a Git submodule at
`third_party/threadx`, pinned to release tag `v6.5.2.202603_rel`
(commit `93387b0a60382a29579bbad5045c68328e3751df`). It is licensed under
the MIT License. Its license text is in `third_party/threadx/LICENSE.txt`.
The license applies to ThreadX, not to this project's original files.

## WICED SDK 3.1.0 reference

The historical reference is
[`wwwllllllll/bcm-wiced-sdk`](https://github.com/wwwllllllll/bcm-wiced-sdk),
release 3.1.0. Its `apps/snip/gpio/gpio.c` and `gpio.mk` identify themselves
as unpublished proprietary Broadcom source. The SDK README also states that
its ThreadX/NetX binaries are free for use with WICED only. Neither those
files nor those binaries are included or copied here. This project recreates
the documented GPIO behavior independently and retains this citation only
to identify the behavior being demonstrated.

## QEMU

QEMU is an external test dependency and is not redistributed by this project.
The tested Windows build reports QEMU 11.1.0. See the QEMU project's licensing
and distribution terms at <https://www.qemu.org/>.

## PDF typography and rendering

The PDF embeds Roboto fonts bundled with the temporary pdfmake 0.2.20 renderer.
The fonts' embedded name-table metadata identifies Copyright 2011 The Roboto
Project Authors and the SIL Open Font License, Version 1.1. The font license
is preserved in `licenses/Roboto-OFL.txt`, also shipped beside the website PDF.
The document content remains under this project's MIT License; the embedded
font software retains its OFL license. See <https://openfontlicense.org/>.

pdfmake is an external MIT-licensed rendering dependency; its source is not
redistributed as part of the site. The HTML uses visitors' system fonts without
downloading or redistributing font files.
