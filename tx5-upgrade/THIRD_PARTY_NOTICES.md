# Third-party notices

## Eclipse ThreadX

The ThreadX source is included as a Git submodule at
`third_party/threadx`, pinned to release tag `v6.5.2.202603_rel`
(commit `93387b0a60382a29579bbad5045c68328e3751df`). It is licensed under
the MIT License. Its license text is in `third_party/threadx/LICENSE.txt`.
The license applies to ThreadX, not to this project's original files.

## WICED SDK 3.1.0 (external ThreadX 5.6 kernel)

[`wwwllllllll/bcm-wiced-sdk`](https://github.com/wwwllllllll/bcm-wiced-sdk),
release 3.1.0, commit `0886ec932a063e12db768cd09428e8a8ab555bce`, is an
external build dependency of the Stage 1 (`tx5-m4`) image only. That stage
compiles against the SDK's ThreadX 5.6 headers and links its prebuilt
`WICED/RTOS/ThreadX/ThreadX.ARM_CM4.release.a` from a separate checkout given
by `TX5_ROOT`. The SDK README states that its ThreadX/NetX binaries are free
for use with WICED only, and its `apps/snip/gpio/gpio.c` and `gpio.mk` identify
themselves as unpublished proprietary Broadcom source.

No SDK file is included or copied in this repository or on the published
site. A built `tx5-m4` ELF contains ThreadX 5.6 object code from the archive
and must not be redistributed; it stays in the git-ignored `build/` directory
and CI does not upload build artifacts. The GPIO behaviour is recreated
independently; the SDK's GPIO snippet is cited only to identify that behaviour.

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
