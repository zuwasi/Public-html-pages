#include "heartgcn/model.h"
#include <cmath>
#include <iostream>
int main(){int fail=0;for(auto&t:heartgcn::runValidationSuite()){std::cout<<(t.passed?"PASS ":"FAIL ")<<t.name<<'\n';fail+=!t.passed;}auto e=heartgcn::syntheticWavefront();for(int y=0;y<9;++y)for(int x=0;x<12;++x)if(std::abs(e.truth[y*12+x]-(x+y))>1e-12){std::cerr<<"108-value Manhattan mismatch at "<<x<<','<<y<<'\n';++fail;}return fail?1:0;}
