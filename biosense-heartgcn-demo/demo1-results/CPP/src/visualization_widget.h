#pragma once
#include <QWidget>
#include "heartgcn/model.h"
class VisualizationWidget : public QWidget {
public:
  explicit VisualizationWidget(QWidget* parent=nullptr);
  void setResult(const heartgcn::Experiment&, const heartgcn::Reconstruction&);
protected: void paintEvent(QPaintEvent*) override;
private: heartgcn::Experiment exp_; heartgcn::Reconstruction rec_; bool ready_=false;
};
