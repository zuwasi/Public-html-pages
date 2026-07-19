#pragma once
#include <QMainWindow>
class QSpinBox; class QDoubleSpinBox; class QLabel; class VisualizationWidget;
class MainWindow:public QMainWindow{
public: MainWindow();
private: void run();void validate();void exportData();QSpinBox *nx_,*ny_,*source_;QDoubleSpinBox *speed_,*fraction_,*noise_;QLabel*status_;VisualizationWidget*viz_;
};
